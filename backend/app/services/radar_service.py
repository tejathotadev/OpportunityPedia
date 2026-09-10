from __future__ import annotations

import logging
import threading
from datetime import datetime, time, timedelta, timezone

import httpx
from fastapi import HTTPException, status

from app.core.config import settings
from app.providers.collectors.collectors import fetch_source
from app.providers.sources.sources import enabled_sources
from app.radar.heat import (
    classify_by_collector,
    group_companies_by_heat,
    match_vendors_to_tenders,
)
from app.repositories import radar_repository

logger = logging.getLogger(__name__)

# How long a run may sit unfinished before it stops blocking the next attempt.
# Generously above a real scan, which is roughly a minute per NAICS code, so
# only a crashed or killed process ever trips it.
_STALE_RUN_AFTER = timedelta(minutes=15)

# Checking the guard and claiming the row have to be one step. Two clicks
# arriving together would otherwise both pass a guard taken before either had
# claimed anything, and each would spend the key quota.
_RESERVE_LOCK = threading.Lock()


def _iso(value: object) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat(sep=" ", timespec="seconds")
    return str(value)


def _job_payload(job: dict) -> dict:
    # `provider` and the raw posting URL both name the collector, so neither is
    # serialised. Employer and agency names are the lead itself and stay.
    return {
        "board_token": job["board_token"],
        "board_name": job["board_name"],
        "external_job_id": job["external_job_id"],
        "title": job["title"],
        "location": job.get("location"),
        "department": job.get("department"),
        "posted_at": job.get("posted_at"),
        "updated_at": job.get("updated_at"),
        "requisition_id": job.get("requisition_id"),
        "heat": job.get("heat") or "HOT",
        "signal_type": job.get("signal_type") or "JOB_OPENING",
        "naics": job.get("naics"),
        "category": job.get("category"),
        "agency_name": job.get("agency_name") or job.get("board_name"),
        "suggested_vendors": job.get("suggested_vendors") or [],
    }


def _vendor_payload(vendor: dict) -> dict:
    return {
        "id": vendor.get("id"),
        "agency_name": vendor.get("agency_name"),
        "agency_token": vendor.get("agency_token") or vendor.get("board_token"),
        "vendor_name": vendor.get("vendor_name"),
        "vendor_uei": vendor.get("vendor_uei"),
        "cage_code": vendor.get("cage_code"),
        "registration_status": vendor.get("registration_status"),
        "award_notice_id": vendor.get("award_notice_id") or vendor.get("external_job_id"),
        "award_title": vendor.get("award_title") or vendor.get("title"),
        "naics": vendor.get("naics"),
        "category": vendor.get("category"),
        "posted_at": vendor.get("posted_at"),
        "heat": vendor.get("heat") or "VERY_HOT",
        "signal_type": vendor.get("signal_type") or "CONTRACT_AWARD",
        "match_score": vendor.get("match_score"),
    }


def _results_payload(
    *, run: dict | None, jobs: list[dict], vendors: list[dict]
) -> dict:
    vendor_payloads = [_vendor_payload(v) for v in vendors]
    matched = match_vendors_to_tenders(jobs, vendor_payloads)
    payloads = [_job_payload(j) for j in matched]
    return {
        "run": run,
        "jobs": payloads,
        "vendors": vendor_payloads,
        "lanes": group_companies_by_heat(payloads),
    }


def _as_utc(value: object) -> datetime | None:
    if not isinstance(value, datetime):
        return None
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def _iso_utc(value: datetime | None) -> str | None:
    return value.isoformat(timespec="seconds") if value else None


def _humanise(delta: timedelta) -> str:
    """Largest sensible unit, so a two-minute wait does not read as "0h 2m"."""
    seconds = max(0, int(delta.total_seconds()))
    if seconds < 60:
        return f"{seconds}s"
    minutes, secs = divmod(seconds, 60)
    if minutes < 60:
        return f"{minutes}m {secs:02d}s" if secs else f"{minutes}m"
    hours, mins = divmod(minutes, 60)
    return f"{hours}h {mins:02d}m" if mins else f"{hours}h"


def radar_status(*, user_id: int) -> dict:
    """What the Run button needs: last run, remaining budget, next allowed time.

    Each run spends one SAM request per NAICS code, against a daily key quota,
    so runs are rationed rather than rate-limited on the client.
    """
    now = datetime.now(timezone.utc)
    midnight = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)
    run = radar_repository.latest_run(user_id)
    last_run_at = _as_utc((run or {}).get("created_at"))
    runs_today = radar_repository.count_runs_since(user_id, midnight.replace(tzinfo=None))

    cooldown = timedelta(minutes=settings.radar_cooldown_minutes)
    runs_per_day = settings.RADAR_RUNS_PER_DAY
    next_allowed: datetime | None = None
    reason: str | None = None

    # A run claims its row before fetching, so an unfinished one blocks the
    # next attempt on its own. That matters when the cooldown is tuned shorter
    # than a scan takes, where waiting on the cooldown alone would let a second
    # scan start while the first is still upstream. Bounded by a stale cutoff
    # so a killed process cannot block runs indefinitely.
    in_progress = (
        str((run or {}).get("status") or "") == "running"
        and last_run_at is not None
        and now - last_run_at < _STALE_RUN_AFTER
    )

    if in_progress:
        reason = "A scan is already in progress."
    elif runs_per_day > 0 and runs_today >= runs_per_day:
        next_allowed = midnight + timedelta(days=1)
        reason = (
            f"Daily limit reached ({runs_today}/{runs_per_day}). Resets at 00:00 UTC."
        )
    elif last_run_at and now - last_run_at < cooldown:
        next_allowed = last_run_at + cooldown
        reason = f"Cooling down. Try again in {_humanise(next_allowed - now)}."

    return {
        "canRun": reason is None,
        "reason": reason,
        # Distinguishes a live scan from a cooldown, which otherwise read alike.
        "running": in_progress,
        "lastRunAt": _iso_utc(last_run_at),
        "lastRunStatus": (run or {}).get("status"),
        # Run notes quote collector names and upstream error text verbatim, so
        # they are readable in the run row and the log but never sent out.
        "jobsFound": (run or {}).get("jobs_found"),
        # Read after a queued scan finishes, which is the only chance the
        # client gets to learn how much of the result was actually new.
        "newCount": (run or {}).get("new_count"),
        "runsToday": runs_today,
        "runsPerDay": runs_per_day,
        "cooldownHours": settings.RADAR_RUN_COOLDOWN_HOURS,
        "cooldownMinutes": settings.radar_cooldown_minutes,
        "nextRunAt": _iso_utc(next_allowed),
    }


def start_radar_run(*, user_id: int) -> dict:
    """Reserves a run and returns immediately, without fetching anything.

    The fetch is left to `execute_radar_run` in the background because a scan
    takes about a minute per NAICS code, which outlives the read timeouts of
    proxies sitting between the browser and this service. The reserved row is
    what makes the button lock on click rather than on completion, so the
    client has a complete answer the moment this returns.
    """
    # Checked before claiming, so a misconfigured install does not consume a
    # run out of the daily budget.
    sources = enabled_sources()
    if not sources:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No enabled sources in providers/sources/sources.py",
        )

    with _RESERVE_LOCK:
        guard = radar_status(user_id=user_id)
        if not guard["canRun"]:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=guard["reason"],
                headers={"X-Next-Run-At": str(guard["nextRunAt"] or "")},
            )
        run_id = radar_repository.create_run(
            user_id=user_id,
            status="running",
            boards_run=0,
            jobs_found=0,
            notes=None,
        )

    # Recomputed after the claim, so `running` is already true in the payload
    # the client seeds its cache with.
    return {"runId": run_id, "cooldown": radar_status(user_id=user_id)}


def execute_radar_run(*, user_id: int, run_id: int) -> None:
    """Scans the sources for a row already reserved by `start_radar_run`.

    Runs after the response has been sent, so raising would only reach the log.
    The run row is the channel the client reads instead, and it must never be
    left claiming to be running or the status endpoint reports a scan that
    will never finish.
    """
    try:
        _fetch_and_store(user_id=user_id, run_id=run_id)
    except Exception as exc:
        logger.exception("Radar run %s failed", run_id)
        radar_repository.update_run(
            run_id=run_id,
            status="failed",
            boards_run=0,
            jobs_found=0,
            notes=f"{type(exc).__name__}: {exc}"[:500],
        )


def _fetch_and_store(*, user_id: int, run_id: int) -> None:
    sources = enabled_sources()
    all_jobs: list[dict] = []
    all_vendors: list[dict] = []
    notes: list[str] = []
    boards_ok = 0

    # Anything raised here is caught by the caller, which marks the reserved
    # row failed so the status endpoint stops reporting a live scan.
    with httpx.Client(
        timeout=max(settings.RADAR_HTTP_TIMEOUT_SECONDS, 90),
        headers={"User-Agent": settings.USER_AGENT},
        follow_redirects=True,
    ) as client:
        for source in sources:
            records, error = fetch_source(source, client)
            name = str(source.get("name") or source.get("token"))
            collector = str(source.get("collector"))
            token = str(source.get("token"))
            if error:
                notes.append(f"{name}: {error}")
                continue
            boards_ok += 1
            heat_meta = classify_by_collector(collector)
            for record in records:
                kind = str(record.get("record_kind") or "tender")
                if kind == "vendor":
                    all_vendors.append(
                        {
                            "provider": collector,
                            **record,
                        }
                    )
                    continue
                warning = record.pop("collector_warning", None)
                if warning:
                    notes.append(f"{name}: {warning}")
                all_jobs.append(
                    {
                        "provider": collector,
                        "board_token": record.get("board_token") or token,
                        "board_name": record.get("board_name") or name,
                        **{
                            k: v
                            for k, v in record.items()
                            if k
                            not in {
                                "board_token",
                                "board_name",
                                "heat",
                                "signal_type",
                                "record_kind",
                                "collector_warning",
                            }
                        },
                        "heat": record.get("heat") or heat_meta["heat"],
                        "signal_type": record.get("signal_type")
                        or heat_meta["signal_type"],
                    }
                )

    # Read before the wipe below, so the run can distinguish "nothing changed
    # upstream" from "we just re-stored the same notices".
    previous_ids = radar_repository.list_job_external_ids(user_id)
    fetched_ids = {
        str(job["external_job_id"]) for job in all_jobs if job.get("external_job_id")
    }
    new_count = len(fetched_ids - previous_ids)

    run_status = "ok" if boards_ok else "failed"
    radar_repository.update_run(
        run_id=run_id,
        status=run_status,
        boards_run=boards_ok,
        jobs_found=len(all_jobs),
        notes="; ".join(notes) if notes else None,
        new_count=new_count,
    )

    radar_repository.clear_user_jobs(user_id)
    radar_repository.clear_user_vendors(user_id)
    job_rows = [
        (
            user_id,
            run_id,
            job["provider"],
            job["board_token"],
            job["board_name"],
            job["external_job_id"],
            job["title"],
            job.get("location"),
            job.get("department"),
            job.get("url"),
            job.get("posted_at"),
            job.get("updated_at"),
            job.get("requisition_id"),
            job.get("heat") or "HOT",
            job.get("signal_type") or "JOB_OPENING",
            job.get("naics"),
            job.get("category"),
            job.get("detail") if isinstance(job.get("detail"), dict) else None,
        )
        for job in all_jobs
    ]
    radar_repository.insert_jobs(job_rows)

    # Persist SAM search detail so drawer facts survive logout / restart.
    try:
        from app.repositories import opportunity_detail_repository

        detail_rows = [
            {
                "notice_id": job.get("external_job_id"),
                "title": job.get("title"),
                "provider": job.get("provider"),
                "board_token": job.get("board_token"),
                "board_name": job.get("board_name"),
                "location": job.get("location"),
                "department": job.get("department"),
                "url": job.get("url"),
                "posted_at": job.get("posted_at"),
                "deadline": job.get("updated_at"),
                "requisition_id": job.get("requisition_id"),
                "heat": job.get("heat") or "HOT",
                "signal_type": job.get("signal_type") or "JOB_OPENING",
                "naics": job.get("naics"),
                "category": job.get("category"),
                "detail": job.get("detail") if isinstance(job.get("detail"), dict) else {},
            }
            for job in all_jobs
            if job.get("external_job_id") and job.get("provider") == "sam_gov"
        ]
        opportunity_detail_repository.upsert_details(user_id, detail_rows)
    except Exception:
        logger.exception("Failed to persist opportunity_details for user_id=%s", user_id)

    # Commercial: company name + totals + facets (no individual job openings).
    try:
        from app.services import op_service

        count = op_service.persist_company_hiring_signals(user_id)
        logger.info(
            "Persisted %s company_hiring_signals for user_id=%s", count, user_id
        )
    except Exception:
        logger.exception(
            "Failed to persist company_hiring_signals for user_id=%s", user_id
        )

    vendor_rows = [
        (
            user_id,
            run_id,
            vendor.get("provider") or "sam_gov",
            vendor.get("agency_name"),
            vendor.get("board_token"),
            vendor.get("vendor_name"),
            vendor.get("vendor_uei"),
            vendor.get("cage_code"),
            vendor.get("registration_status"),
            vendor.get("external_job_id"),
            vendor.get("award_title") or vendor.get("title"),
            vendor.get("url"),
            vendor.get("naics"),
            vendor.get("posted_at"),
            vendor.get("heat") or "VERY_HOT",
            vendor.get("signal_type") or "CONTRACT_AWARD",
            vendor.get("category"),
        )
        for vendor in all_vendors
        if vendor.get("vendor_name")
    ]
    radar_repository.insert_vendors(vendor_rows)


def latest_results(*, user_id: int) -> dict:
    run = radar_repository.latest_run(user_id)
    jobs = radar_repository.list_jobs_for_user(user_id)
    vendors = radar_repository.list_vendors_for_user(user_id)
    run_payload = None
    if run:
        run_payload = {
            "id": run["id"],
            "status": run["status"],
            "boards_run": run["boards_run"],
            "jobs_found": run["jobs_found"],
            "vendors_found": len(vendors),
            # Notes quote collector names verbatim; kept in the run row only.
            "created_at": _iso(run.get("created_at")),
        }
    job_payloads = []
    for row in jobs:
        job_payloads.append(
            {
                "id": row["id"],
                # `provider` and `url` both identify the collector, so neither
                # is serialised. `board_name` is the employer or agency, which
                # is the lead itself and stays.
                "board_token": row["board_token"],
                "board_name": row["board_name"],
                "external_job_id": row["external_job_id"],
                "title": row["title"],
                "location": row.get("location"),
                "department": row.get("department"),
                "posted_at": row.get("posted_at"),
                "updated_at": row.get("updated_at"),
                "requisition_id": row.get("requisition_id"),
                "heat": row.get("heat") or "HOT",
                "signal_type": row.get("signal_type") or "JOB_OPENING",
                "naics": row.get("naics"),
                "category": row.get("category"),
                "agency_name": row.get("board_name"),
                "created_at": _iso(row.get("created_at")),
            }
        )
    vendor_payloads = []
    for row in vendors:
        vendor_payloads.append(
            {
                **_vendor_payload(row),
                "created_at": _iso(row.get("created_at")),
            }
        )
    return _results_payload(run=run_payload, jobs=job_payloads, vendors=vendor_payloads)
