"""Durable Radar run history in Postgres (survives API restarts).

Live cooldown still uses the in-memory store; this table is the admin/user audit trail.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from psycopg.types.json import Json

from app.db.connection import connect_database
from app.db.schema import Tables

_ready = False


def _ensure(cur) -> None:
    global _ready
    if _ready:
        return
    cur.execute(
        f"""
        CREATE TABLE IF NOT EXISTS {Tables.radar_runs} (
          id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          user_id           bigint NOT NULL REFERENCES {Tables.users} (id) ON DELETE CASCADE,
          memory_run_id     bigint,
          status            text NOT NULL DEFAULT 'running',
          boards_run        integer NOT NULL DEFAULT 0,
          jobs_found        integer NOT NULL DEFAULT 0,
          new_count         integer NOT NULL DEFAULT 0,
          notes             text,
          new_items         jsonb NOT NULL DEFAULT '[]'::jsonb,
          created_at        timestamptz NOT NULL DEFAULT now(),
          finished_at       timestamptz
        )
        """
    )
    cur.execute(
        f"""
        CREATE INDEX IF NOT EXISTS ix_radar_runs_user_created
          ON {Tables.radar_runs} (user_id, created_at DESC)
        """
    )
    _ready = True


def insert_running(*, user_id: int, memory_run_id: int) -> int:
    with connect_database() as conn:
        with conn.cursor() as cur:
            _ensure(cur)
            cur.execute(
                f"""
                INSERT INTO {Tables.radar_runs}
                  (user_id, memory_run_id, status, boards_run, jobs_found, new_count)
                VALUES (%s, %s, 'running', 0, 0, 0)
                RETURNING id
                """,
                (user_id, memory_run_id),
            )
            row = cur.fetchone()
            return int(row["id"])


def complete(
    *,
    history_id: int,
    status: str,
    boards_run: int,
    jobs_found: int,
    new_count: int,
    notes: str | None,
    new_items: list[dict[str, Any]] | None = None,
) -> None:
    with connect_database() as conn:
        with conn.cursor() as cur:
            _ensure(cur)
            cur.execute(
                f"""
                UPDATE {Tables.radar_runs}
                SET status = %s,
                    boards_run = %s,
                    jobs_found = %s,
                    new_count = %s,
                    notes = %s,
                    new_items = %s,
                    finished_at = NOW()
                WHERE id = %s
                """,
                (
                    status,
                    boards_run,
                    jobs_found,
                    new_count,
                    notes,
                    Json(new_items or []),
                    history_id,
                ),
            )


def list_for_user(*, user_id: int, limit: int = 50) -> list[dict[str, Any]]:
    with connect_database() as conn:
        with conn.cursor() as cur:
            _ensure(cur)
            cur.execute(
                f"""
                SELECT id, user_id, memory_run_id, status, boards_run, jobs_found,
                       new_count, notes, new_items, created_at, finished_at
                FROM {Tables.radar_runs}
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (user_id, limit),
            )
            return list(cur.fetchall())


def latest_for_user(user_id: int) -> dict[str, Any] | None:
    rows = list_for_user(user_id=user_id, limit=1)
    return rows[0] if rows else None


def count_since(user_id: int, since: datetime) -> int:
    with connect_database() as conn:
        with conn.cursor() as cur:
            _ensure(cur)
            cur.execute(
                f"""
                SELECT COUNT(*)::int AS n
                FROM {Tables.radar_runs}
                WHERE user_id = %s AND created_at >= %s
                """,
                (user_id, since),
            )
            row = cur.fetchone()
            return int(row["n"] if row else 0)
