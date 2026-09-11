"""Process-local store for radar runs and their results.

Deliberately not backed by MySQL. Identity comes from `OP_PUBLIC_USER_ID`
rather than the users table, and the radar tables were the only other thing
the read API touched, so holding results in memory removes the database from
the request path entirely. Signatures match the SQL versions they replaced,
so the services above are unaware of the swap.

Three consequences to keep in mind:

* One worker only. Nothing is shared between processes, so `--workers 1`.
* Every restart starts empty, and refilling costs one upstream request per
  NAICS code against a daily key quota.
* `created_at` is stored naive in UTC because that is how the SQL columns read
  back, and `radar_service` treats a naive value as UTC. Storing an aware
  datetime here would shift every cooldown by the local offset.
"""

from __future__ import annotations

import threading
from datetime import datetime, timezone
from itertools import count
from typing import Any

# Positional inserts are the contract with `radar_service`, which builds tuples
# in this order. These lists are what the SQL column lists used to be.
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

# A scan runs in a background thread while requests keep reading, so every
# access is guarded. The critical sections are all short list operations.
_LOCK = threading.Lock()
_ids = count(1)

_runs: dict[int, dict[str, Any]] = {}
_jobs: list[dict[str, Any]] = []
_vendors: list[dict[str, Any]] = []


def _now() -> datetime:
    """Naive UTC, matching how the SQL `created_at` columns read back."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _row(columns: tuple[str, ...], values: tuple[Any, ...]) -> dict[str, Any]:
    row = dict(zip(columns, values, strict=True))
    row["id"] = next(_ids)
    row["created_at"] = _now()
    return row


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
        }
        return run_id


def update_run(
    *,
    run_id: int,
    status: str,
    boards_run: int,
    jobs_found: int,
    notes: str | None,
    new_count: int = 0,
) -> None:
    """Fills in the outcome of a row reserved before the fetch began.

    `created_at` is left untouched on purpose: it records when the run was
    claimed, which is the instant the cooldown has to be measured from.
    """
    with _LOCK:
        run = _runs.get(run_id)
        if run is None:
            return
        run.update(
            status=status,
            boards_run=boards_run,
            jobs_found=jobs_found,
            notes=notes,
            new_count=new_count,
        )


def clear_user_jobs(user_id: int) -> None:
    with _LOCK:
        _jobs[:] = [row for row in _jobs if row["user_id"] != user_id]


def clear_user_vendors(user_id: int) -> None:
    with _LOCK:
        _vendors[:] = [row for row in _vendors if row["user_id"] != user_id]


def list_job_external_ids(user_id: int) -> set[str]:
    """Notice IDs currently stored, read before a run replaces them so the
    result can report what is genuinely new."""
    with _LOCK:
        return {
            str(row["external_job_id"])
            for row in _jobs
            if row["user_id"] == user_id and row.get("external_job_id")
        }


def insert_jobs(rows: list[tuple[Any, ...]]) -> None:
    if not rows:
        return
    with _LOCK:
        _jobs.extend(_row(_JOB_COLUMNS, values) for values in rows)


def insert_vendors(rows: list[tuple[Any, ...]]) -> None:
    if not rows:
        return
    with _LOCK:
        _vendors.extend(_row(_VENDOR_COLUMNS, values) for values in rows)


def latest_run(user_id: int) -> dict[str, Any] | None:
    with _LOCK:
        runs = [run for run in _runs.values() if run["user_id"] == user_id]
        if not runs:
            return None
        return dict(max(runs, key=lambda run: run["id"]))


def count_runs_since(user_id: int, since: Any) -> int:
    with _LOCK:
        return sum(
            1
            for run in _runs.values()
            if run["user_id"] == user_id and run["created_at"] >= since
        )


def _sorted_copy(
    rows: list[dict[str, Any]],
    user_id: int,
    keys: tuple[str, str],
    limit: int,
) -> list[dict[str, Any]]:
    """Copies are handed out so callers cannot mutate the store in place;
    `radar_service` pops keys off the records it reads."""
    with _LOCK:
        mine = [dict(row) for row in rows if row["user_id"] == user_id]
    # Either key can be absent or null, which is unorderable against a string.
    mine.sort(key=lambda row: tuple(str(row.get(key) or "") for key in keys))
    return mine[:limit]


def list_jobs_for_user(user_id: int, *, limit: int = 500) -> list[dict[str, Any]]:
    """Commercial rows may be capped; SAM notices are always included.

    A full Greenhouse scan can exceed `limit` with hiring jobs alone, which
    used to drop government tenders from Overview / Tenders.
    """
    with _LOCK:
        mine = [dict(row) for row in _jobs if row["user_id"] == user_id]
    sam = [row for row in mine if str(row.get("provider") or "") == "sam_gov"]
    other = [row for row in mine if str(row.get("provider") or "") != "sam_gov"]
    other.sort(key=lambda row: (str(row.get("board_name") or ""), str(row.get("title") or "")))
    sam.sort(key=lambda row: (str(row.get("board_name") or ""), str(row.get("title") or "")))
    return other[: max(1, limit)] + sam


def list_vendors_for_user(user_id: int, *, limit: int = 500) -> list[dict[str, Any]]:
    return _sorted_copy(_vendors, user_id, ("agency_name", "vendor_name"), limit)
