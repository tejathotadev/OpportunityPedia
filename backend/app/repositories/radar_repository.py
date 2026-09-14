"""Radar runs (live) + durable job/vendor snapshots in Postgres.

Run *status* for an in-flight scan stays process-local so cooldown / `running`
updates stay fast. Job and vendor rows are written to Postgres so Overview and
opportunity lists survive API restarts.

History rows remain in `radar_runs` via `radar_history_repository`.
"""

from __future__ import annotations

import logging
import threading
from datetime import datetime, timezone
from itertools import count
from typing import Any

from psycopg.types.json import Json

from app.db.connection import connect_database, transaction
from app.db.schema import Tables

logger = logging.getLogger(__name__)

_JOB_COLUMNS = (
    "user_id",
    "run_id",
    "provider",
    "board_token",
    "board_name",
    "external_job_id",
    "title",
    "location",
    "department",
    "url",
    "posted_at",
    "updated_at",
    "requisition_id",
    "heat",
    "signal_type",
    "naics",
    "category",
    "detail",
)

_VENDOR_COLUMNS = (
    "user_id",
    "run_id",
    "provider",
    "agency_name",
    "agency_token",
    "vendor_name",
    "vendor_uei",
    "cage_code",
    "registration_status",
    "award_notice_id",
    "award_title",
    "award_url",
    "naics",
    "posted_at",
    "heat",
    "signal_type",
    "category",
)

_LOCK = threading.Lock()
_ids = count(1)

_runs: dict[int, dict[str, Any]] = {}


def _now() -> datetime:
    """Naive UTC, matching how the SQL `created_at` columns read back."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def create_run(
    *,
    user_id: int,
    status: str,
    boards_run: int,
    jobs_found: int,
    notes: str | None,
) -> int:
    with _LOCK:
        run_id = next(_ids)
        _runs[run_id] = {
            "id": run_id,
            "user_id": user_id,
            "status": status,
            "boards_run": boards_run,
            "jobs_found": jobs_found,
            "new_count": 0,
            "notes": notes,
            "created_at": _now(),
            "history_id": None,
            "new_items": [],
        }

    try:
        from app.repositories import radar_history_repository

        history_id = radar_history_repository.insert_running(
            user_id=user_id, memory_run_id=run_id
        )
        with _LOCK:
            if run_id in _runs:
                _runs[run_id]["history_id"] = history_id
    except Exception:
        logger.exception(
            "radar history insert failed for user %s run %s", user_id, run_id
        )

    return run_id


def update_run(
    *,
    run_id: int,
    status: str,
    boards_run: int,
    jobs_found: int,
    notes: str | None,
    new_count: int = 0,
    new_items: list[dict[str, Any]] | None = None,
) -> None:
    """Fills in the outcome of a row reserved before the fetch began.

    `created_at` is left untouched on purpose: it records when the run was
    claimed, which is the instant the cooldown has to be measured from.
    """
    history_id: int | None = None
    with _LOCK:
        run = _runs.get(run_id)
        if run is None:
            return
        history_id = run.get("history_id")
        run.update(
            status=status,
            boards_run=boards_run,
            jobs_found=jobs_found,
            notes=notes,
            new_count=new_count,
            new_items=list(new_items or []),
        )

    if history_id:
        try:
            from app.repositories import radar_history_repository

            radar_history_repository.complete(
                history_id=int(history_id),
                status=status,
                boards_run=boards_run,
                jobs_found=jobs_found,
                new_count=new_count,
                notes=notes,
                new_items=new_items,
            )
        except Exception:
            logger.exception(
                "radar history complete failed for history_id %s", history_id
            )


def clear_user_jobs(user_id: int) -> None:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"DELETE FROM {Tables.radar_jobs} WHERE user_id = %s",
                (user_id,),
            )


def clear_user_vendors(user_id: int) -> None:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"DELETE FROM {Tables.radar_vendors} WHERE user_id = %s",
                (user_id,),
            )


def clear_user_runs(user_id: int) -> None:
    with _LOCK:
        stale = [rid for rid, run in _runs.items() if run.get("user_id") == user_id]
        for rid in stale:
            del _runs[rid]


def clear_user_workspace(user_id: int) -> None:
    """Drop radar state for a removed / purged customer."""
    clear_user_jobs(user_id)
    clear_user_vendors(user_id)
    clear_user_runs(user_id)


def list_job_external_ids(user_id: int) -> set[str]:
    """Notice IDs currently stored, read before a run replaces them so the
    result can report what is genuinely new."""
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT external_job_id
                FROM {Tables.radar_jobs}
                WHERE user_id = %s AND external_job_id IS NOT NULL
                """,
                (user_id,),
            )
            return {str(row["external_job_id"]) for row in cur.fetchall() or []}


def insert_jobs(rows: list[tuple[Any, ...]]) -> None:
    if not rows:
        return
    with connect_database() as conn:
        _insert_jobs(conn, rows)


def insert_vendors(rows: list[tuple[Any, ...]]) -> None:
    if not rows:
        return
    with connect_database() as conn:
        _insert_vendors(conn, rows)


def replace_user_jobs_and_vendors(
    *,
    user_id: int,
    job_rows: list[tuple[Any, ...]],
    vendor_rows: list[tuple[Any, ...]],
) -> None:
    """Atomic wipe + insert for one workspace after a Radar scan."""
    with transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"DELETE FROM {Tables.radar_jobs} WHERE user_id = %s",
                (user_id,),
            )
            cur.execute(
                f"DELETE FROM {Tables.radar_vendors} WHERE user_id = %s",
                (user_id,),
            )
        if job_rows:
            _insert_jobs(conn, job_rows)
        if vendor_rows:
            _insert_vendors(conn, vendor_rows)


def _insert_jobs(conn, rows: list[tuple[Any, ...]]) -> None:
    prepared: list[tuple[Any, ...]] = []
    for values in rows:
        row = dict(zip(_JOB_COLUMNS, values, strict=True))
        detail = row.get("detail")
        prepared.append(
            (
                row["user_id"],
                row["run_id"],
                row["provider"],
                row.get("board_token"),
                row.get("board_name"),
                row.get("external_job_id"),
                row.get("title"),
                row.get("location"),
                row.get("department"),
                row.get("url"),
                row.get("posted_at"),
                row.get("updated_at"),
                row.get("requisition_id"),
                row.get("heat"),
                row.get("signal_type"),
                row.get("naics"),
                row.get("category"),
                Json(detail) if isinstance(detail, dict) else detail,
            )
        )
    with conn.cursor() as cur:
        cur.executemany(
            f"""
            INSERT INTO {Tables.radar_jobs}
              (user_id, run_id, provider, board_token, board_name, external_job_id,
               title, location, department, url, posted_at, updated_at,
               requisition_id, heat, signal_type, naics, category, detail)
            VALUES
              (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            prepared,
        )


def _insert_vendors(conn, rows: list[tuple[Any, ...]]) -> None:
    with conn.cursor() as cur:
        cur.executemany(
            f"""
            INSERT INTO {Tables.radar_vendors}
              (user_id, run_id, provider, agency_name, agency_token, vendor_name,
               vendor_uei, cage_code, registration_status, award_notice_id,
               award_title, award_url, naics, posted_at, heat, signal_type, category)
            VALUES
              (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            rows,
        )


def latest_run(user_id: int) -> dict[str, Any] | None:
    with _LOCK:
        runs = [run for run in _runs.values() if run["user_id"] == user_id]
        if runs:
            return dict(max(runs, key=lambda run: run["id"]))

    try:
        from app.repositories import radar_history_repository

        row = radar_history_repository.latest_for_user(user_id)
        if not row:
            return None
        created = row.get("created_at")
        if isinstance(created, datetime) and created.tzinfo is not None:
            created = created.replace(tzinfo=None)
        return {
            "id": row.get("memory_run_id") or row["id"],
            "user_id": row["user_id"],
            "status": row["status"],
            "boards_run": row["boards_run"],
            "jobs_found": row["jobs_found"],
            "new_count": row["new_count"],
            "notes": row.get("notes"),
            "created_at": created,
            "new_items": row.get("new_items") or [],
        }
    except Exception:
        return None


def count_runs_since(user_id: int, since: Any) -> int:
    try:
        from app.repositories import radar_history_repository

        return radar_history_repository.count_since(user_id, since)
    except Exception:
        with _LOCK:
            return sum(
                1
                for run in _runs.values()
                if run["user_id"] == user_id and run["created_at"] >= since
            )


def list_jobs_for_user(user_id: int, *, limit: int = 500) -> list[dict[str, Any]]:
    """Commercial rows may be capped; SAM notices are always included."""
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, user_id, run_id, provider, board_token, board_name,
                       external_job_id, title, location, department, url,
                       posted_at, updated_at, requisition_id, heat, signal_type,
                       naics, category, detail, created_at
                FROM {Tables.radar_jobs}
                WHERE user_id = %s
                ORDER BY board_name NULLS LAST, title NULLS LAST
                """,
                (user_id,),
            )
            mine = [dict(row) for row in cur.fetchall() or []]

    sam = [row for row in mine if str(row.get("provider") or "") == "sam_gov"]
    other = [row for row in mine if str(row.get("provider") or "") != "sam_gov"]
    return other[: max(1, limit)] + sam


def list_vendors_for_user(user_id: int, *, limit: int = 500) -> list[dict[str, Any]]:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, user_id, run_id, provider, agency_name, agency_token,
                       vendor_name, vendor_uei, cage_code, registration_status,
                       award_notice_id, award_title, award_url, naics, posted_at,
                       heat, signal_type, category, created_at
                FROM {Tables.radar_vendors}
                WHERE user_id = %s
                ORDER BY agency_name NULLS LAST, vendor_name NULLS LAST
                LIMIT %s
                """,
                (user_id, max(1, limit)),
            )
            return [dict(row) for row in cur.fetchall() or []]


def query_jobs_page(
    *,
    user_id: int,
    providers: list[str] | None = None,
    heats: list[str] | None = None,
    signal_types: list[str] | None = None,
    board_token: str | None = None,
    search: str | None = None,
    title_match: str | None = None,
    locations: list[str] | None = None,
    categories: list[str] | None = None,
    countries: list[str] | None = None,
    detected_within_days: int | None = None,
    deadline_within_days: int | None = None,
    sort_by: str | None = None,
    sort_dir: str = "asc",
    limit: int = 25,
    offset: int = 0,
) -> tuple[list[dict[str, Any]], int]:
    """Filter / sort / page radar_jobs in SQL. Returns (rows, total_matching)."""
    where: list[str] = ["user_id = %s"]
    args: list[Any] = [user_id]

    if providers:
        where.append("lower(provider) = ANY(%s)")
        args.append([p.lower() for p in providers])

    if heats:
        upper = [h.upper() for h in heats]
        if "HOT" in upper and "VERY_HOT" not in upper:
            # "hot" in the product means everything that is not very_hot.
            where.append("upper(COALESCE(heat, 'HOT')) <> 'VERY_HOT'")
        elif "VERY_HOT" in upper and "HOT" not in upper:
            where.append("upper(COALESCE(heat, 'HOT')) = 'VERY_HOT'")
        else:
            where.append("upper(COALESCE(heat, 'HOT')) = ANY(%s)")
            args.append(upper)

    if signal_types:
        where.append("upper(COALESCE(signal_type, '')) = ANY(%s)")
        args.append([s.upper() for s in signal_types])

    if board_token:
        where.append("board_token = %s")
        args.append(board_token)

    if search and search.strip():
        needle = f"%{search.strip()}%"
        where.append(
            "(title ILIKE %s OR board_name ILIKE %s OR COALESCE(location, '') ILIKE %s "
            "OR COALESCE(category, '') ILIKE %s)"
        )
        args.extend([needle, needle, needle, needle])

    if title_match and title_match.strip():
        where.append("title ILIKE %s")
        args.append(f"%{title_match.strip()}%")

    if locations:
        where.append("location = ANY(%s)")
        args.append(locations)

    if categories:
        parts = ["COALESCE(category, '') = ANY(%s)"]
        args.append(list(categories))
        if "Hiring" in categories:
            parts.append("upper(COALESCE(signal_type, '')) = 'JOB_OPENING'")
        if "Employment Services" in categories:
            parts.append(
                "(upper(COALESCE(signal_type, '')) <> 'JOB_OPENING' "
                "AND COALESCE(NULLIF(category, ''), '') = '')"
            )
        where.append("(" + " OR ".join(parts) + ")")

    if countries:
        country_clauses: list[str] = []
        for code in countries:
            c = str(code).upper()
            if c == "US":
                country_clauses.append(
                    "(lower(provider) = 'sam_gov' OR location ILIKE '%united states%' "
                    "OR location ILIKE '%u.s.%' OR location ~* '\\y(usa|us)\\y')"
                )
            elif c == "IN":
                country_clauses.append(
                    "(location ILIKE '%india%' OR location ILIKE '%bengaluru%' "
                    "OR location ILIKE '%bangalore%' OR location ILIKE '%hyderabad%' "
                    "OR location ILIKE '%mumbai%' OR location ILIKE '%delhi%' "
                    "OR location ILIKE '%chennai%' OR location ILIKE '%pune%')"
                )
            elif c == "OTHER":
                country_clauses.append(
                    "(lower(provider) <> 'sam_gov' AND COALESCE(location, '') <> '' "
                    "AND location NOT ILIKE '%united states%' AND location NOT ILIKE '%u.s.%' "
                    "AND location NOT ILIKE '%india%')"
                )
        if country_clauses:
            where.append("(" + " OR ".join(country_clauses) + ")")

    # Best-effort ISO date windows (posted_at / updated_at are text).
    if detected_within_days and detected_within_days > 0:
        where.append(
            """
            (
              (
                posted_at ~ '^[0-9]{4}-'
                AND posted_at::timestamptz >= (NOW() - (%s * INTERVAL '1 day'))
              )
              OR (
                (posted_at IS NULL OR posted_at = '' OR posted_at !~ '^[0-9]{4}-')
                AND created_at >= (NOW() - (%s * INTERVAL '1 day'))
              )
            )
            """
        )
        args.extend([detected_within_days, detected_within_days])

    if deadline_within_days and deadline_within_days > 0:
        where.append(
            """
            updated_at ~ '^[0-9]{4}-'
            AND updated_at::timestamptz::date >= CURRENT_DATE
            AND updated_at::timestamptz::date
                <= CURRENT_DATE + (%s * INTERVAL '1 day')
            AND upper(COALESCE(signal_type, '')) <> 'JOB_OPENING'
            """
        )
        args.append(deadline_within_days)

    where_sql = " AND ".join(where)

    sort_map = {
        "title": "title",
        "companyName": "board_name",
        "location": "location",
        "detectedAt": "posted_at",
        "deadline": "updated_at",
        "type": "signal_type",
        "temperature": "heat",
    }
    direction = "DESC" if str(sort_dir).lower() == "desc" else "ASC"
    if sort_by in sort_map:
        if sort_by == "temperature":
            order_sql = (
                f"CASE WHEN upper(COALESCE(heat, 'HOT')) = 'VERY_HOT' THEN 0 ELSE 1 END {direction}, "
                f"posted_at DESC NULLS LAST"
            )
        else:
            col = sort_map[sort_by]
            order_sql = f"{col} {direction} NULLS LAST"
    else:
        order_sql = (
            "CASE WHEN upper(COALESCE(heat, 'HOT')) = 'VERY_HOT' THEN 0 ELSE 1 END ASC, "
            "posted_at DESC NULLS LAST, id DESC"
        )

    limit = max(1, min(int(limit), 500))
    offset = max(0, int(offset))

    sql = f"""
        SELECT id, user_id, run_id, provider, board_token, board_name,
               external_job_id, title, location, department, url,
               posted_at, updated_at, requisition_id, heat, signal_type,
               naics, category, detail, created_at,
               COUNT(*) OVER() AS _total
        FROM {Tables.radar_jobs}
        WHERE {where_sql}
        ORDER BY {order_sql}
        LIMIT %s OFFSET %s
    """
    try:
        with connect_database() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, [*args, limit, offset])
                rows = [dict(r) for r in cur.fetchall() or []]
    except Exception:
        # Dirty posted_at/updated_at text can break casts — retry without date filters.
        if detected_within_days or deadline_within_days:
            return query_jobs_page(
                user_id=user_id,
                providers=providers,
                heats=heats,
                signal_types=signal_types,
                board_token=board_token,
                search=search,
                title_match=title_match,
                locations=locations,
                categories=categories,
                countries=countries,
                detected_within_days=None,
                deadline_within_days=None,
                sort_by=sort_by,
                sort_dir=sort_dir,
                limit=limit,
                offset=offset,
            )
        raise

    total = int(rows[0]["_total"]) if rows else 0
    for row in rows:
        row.pop("_total", None)
    return rows, total
