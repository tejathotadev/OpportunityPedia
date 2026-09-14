from __future__ import annotations

from datetime import datetime
from typing import Any

import psycopg

from app.db.connection import connect_database, transaction
from app.db.schema import Tables


def insert(
    *,
    user_id: int,
    token_hash: str,
    expires_at: datetime,
    conn: psycopg.Connection | None = None,
) -> None:
    def _run(cur) -> None:
        cur.execute(
            f"""
            INSERT INTO {Tables.password_tokens} (user_id, token_hash, expires_at)
            VALUES (%s, %s, %s)
            """,
            (user_id, token_hash, expires_at),
        )

    if conn is not None:
        with conn.cursor() as cur:
            _run(cur)
        return
    with connect_database() as owned:
        with owned.cursor() as cur:
            _run(cur)


def expire_open_for_user(user_id: int, *, conn: psycopg.Connection | None = None) -> None:
    def _run(cur) -> None:
        cur.execute(
            f"""
            UPDATE {Tables.password_tokens}
            SET used_at = NOW()
            WHERE user_id = %s AND used_at IS NULL
            """,
            (user_id,),
        )

    if conn is not None:
        with conn.cursor() as cur:
            _run(cur)
        return
    with connect_database() as owned:
        with owned.cursor() as cur:
            _run(cur)


def rotate_open_token(
    *, user_id: int, token_hash: str, expires_at: datetime
) -> None:
    """Expire prior open tokens and insert the new one atomically."""
    with transaction() as conn:
        expire_open_for_user(user_id, conn=conn)
        insert(user_id=user_id, token_hash=token_hash, expires_at=expires_at, conn=conn)


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


def mark_used(token_id: int, *, conn: psycopg.Connection | None = None) -> None:
    def _run(cur) -> None:
        cur.execute(
            f"""
            UPDATE {Tables.password_tokens}
            SET used_at = NOW()
            WHERE id = %s
            """,
            (token_id,),
        )

    if conn is not None:
        with conn.cursor() as cur:
            _run(cur)
        return
    with connect_database() as owned:
        with owned.cursor() as cur:
            _run(cur)
