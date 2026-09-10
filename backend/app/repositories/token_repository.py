from __future__ import annotations

from datetime import datetime
from typing import Any

from app.db.connection import connect_database
from app.db.schema import Tables


def insert(*, user_id: int, token_hash: str, expires_at: datetime) -> None:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                INSERT INTO {Tables.password_tokens} (user_id, token_hash, expires_at)
                VALUES (%s, %s, %s)
                """,
                (user_id, token_hash, expires_at),
            )


def expire_open_for_user(user_id: int) -> None:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE {Tables.password_tokens}
                SET used_at = NOW()
                WHERE user_id = %s AND used_at IS NULL
                """,
                (user_id,),
            )


def find_valid(token_hash: str) -> dict[str, Any] | None:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, user_id, token_hash, expires_at, used_at, created_at
                FROM {Tables.password_tokens}
                WHERE token_hash = %s
                  AND used_at IS NULL
                  AND expires_at > NOW()
                LIMIT 1
                """,
                (token_hash,),
            )
            return cur.fetchone()


def mark_used(token_id: int) -> None:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE {Tables.password_tokens}
                SET used_at = NOW()
                WHERE id = %s
                """,
                (token_id,),
            )
