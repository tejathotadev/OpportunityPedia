"""Persist Assign-to-me ownership for tenders and commercial companies."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.db.connection import connect_database
from app.db.schema import Tables


def _iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).isoformat(timespec="seconds")
    return str(value)


def _ensure_table(cur) -> None:
    cur.execute(
        f"""
        CREATE TABLE IF NOT EXISTS {Tables.opportunity_assignments} (
          id                  bigint generated always as identity primary key,
          user_id             bigint not null references public.users (id) on delete cascade,
          opportunity_id      text not null,
          assigned_to_id      bigint not null references public.users (id) on delete cascade,
          assigned_to_name    text not null,
          assigned_at         timestamptz not null default now(),
          constraint uq_opportunity_assignments_user_opp unique (user_id, opportunity_id)
        )
        """
    )


def upsert(
    *,
    user_id: int,
    opportunity_id: str,
    assigned_to_id: int,
    assigned_to_name: str,
) -> dict[str, Any]:
    with connect_database() as conn:
        with conn.cursor() as cur:
            _ensure_table(cur)
            cur.execute(
                f"""
                INSERT INTO {Tables.opportunity_assignments}
                    (user_id, opportunity_id, assigned_to_id, assigned_to_name)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (user_id, opportunity_id) DO UPDATE SET
                    assigned_to_id = EXCLUDED.assigned_to_id,
                    assigned_to_name = EXCLUDED.assigned_to_name,
                    assigned_at = now()
                RETURNING opportunity_id, assigned_to_id, assigned_to_name, assigned_at
                """,
                (user_id, opportunity_id, assigned_to_id, assigned_to_name.strip()),
            )
            row = cur.fetchone()
    return _map(row)


def delete(*, user_id: int, opportunity_id: str) -> None:
    with connect_database() as conn:
        with conn.cursor() as cur:
            _ensure_table(cur)
            cur.execute(
                f"""
                DELETE FROM {Tables.opportunity_assignments}
                WHERE user_id = %s AND opportunity_id = %s
                """,
                (user_id, opportunity_id),
            )


def get(*, user_id: int, opportunity_id: str) -> dict[str, Any] | None:
    with connect_database() as conn:
        with conn.cursor() as cur:
            _ensure_table(cur)
            cur.execute(
                f"""
                SELECT opportunity_id, assigned_to_id, assigned_to_name, assigned_at
                FROM {Tables.opportunity_assignments}
                WHERE user_id = %s AND opportunity_id = %s
                LIMIT 1
                """,
                (user_id, opportunity_id),
            )
            row = cur.fetchone()
    return _map(row) if row else None


def map_for_user(user_id: int) -> dict[str, dict[str, Any]]:
    with connect_database() as conn:
        with conn.cursor() as cur:
            _ensure_table(cur)
            cur.execute(
                f"""
                SELECT opportunity_id, assigned_to_id, assigned_to_name, assigned_at
                FROM {Tables.opportunity_assignments}
                WHERE user_id = %s
                """,
                (user_id,),
            )
            rows = cur.fetchall() or []
    return {str(row["opportunity_id"]): _map(row) for row in rows}


def _map(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "opportunityId": str(row["opportunity_id"]),
        "assignedToId": str(row["assigned_to_id"]),
        "assignedToName": row.get("assigned_to_name") or "",
        "assignedAt": _iso(row.get("assigned_at")),
    }
