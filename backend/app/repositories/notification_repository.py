from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from app.db.connection import connect_database
from app.db.schema import Tables


def _row_to_item(row: dict[str, Any]) -> dict[str, Any]:
    read_at = row.get("read_at")
    return {
        "id": str(row["id"]),
        "type": row["type"],
        "title": row["title"],
        "description": row.get("description") or "",
        "createdAt": row["created_at"].isoformat() if row.get("created_at") else None,
        "read": read_at is not None,
        "opportunityId": row.get("opportunity_id") or None,
        "action": row.get("action") or None,
    }


def insert_many(rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    with connect_database() as conn:
        with conn.cursor() as cur:
            for row in rows:
                cur.execute(
                    f"""
                    INSERT INTO {Tables.app_notifications}
                      (user_id, workspace_id, type, title, description,
                       opportunity_id, action)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        int(row["user_id"]),
                        int(row["workspace_id"]),
                        row["type"],
                        row["title"],
                        row.get("description") or "",
                        row.get("opportunity_id"),
                        row.get("action"),
                    ),
                )


def list_for_user(*, user_id: int, limit: int = 80) -> list[dict[str, Any]]:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, type, title, description, opportunity_id, action, read_at, created_at
                FROM {Tables.app_notifications}
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (user_id, limit),
            )
            return [_row_to_item(dict(row)) for row in cur.fetchall()]


def mark_read(*, user_id: int, notification_id: str) -> bool:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE {Tables.app_notifications}
                SET read_at = %s
                WHERE user_id = %s AND id = %s AND read_at IS NULL
                """,
                (datetime.now(timezone.utc), user_id, notification_id),
            )
            return cur.rowcount > 0


def mark_all_read(*, user_id: int) -> int:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE {Tables.app_notifications}
                SET read_at = %s
                WHERE user_id = %s AND read_at IS NULL
                """,
                (datetime.now(timezone.utc), user_id),
            )
            return int(cur.rowcount or 0)
