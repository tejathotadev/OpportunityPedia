from __future__ import annotations

from typing import Any

from app.db.connection import connect_database
from app.db.schema import Tables


def insert_pending(
    *,
    user_id: int,
    amount_cents: int,
    currency: str,
) -> int:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                INSERT INTO {Tables.payments}
                    (user_id, amount_cents, currency, status, provider)
                VALUES (%s, %s, %s, 'pending', 'razorpay')
                RETURNING id
                """,
                (user_id, amount_cents, currency.lower()),
            )
            row = cur.fetchone()
            return int(row["id"])


def find_by_id(payment_id: int) -> dict[str, Any] | None:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, user_id, amount_cents, currency, status, provider,
                       provider_order_id, provider_payment_id, paid_at, created_at
                FROM {Tables.payments}
                WHERE id = %s
                LIMIT 1
                """,
                (payment_id,),
            )
            return cur.fetchone()


def set_order_id(payment_id: int, order_id: str) -> None:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE {Tables.payments}
                SET provider_order_id = %s, provider = 'razorpay'
                WHERE id = %s
                """,
                (order_id, payment_id),
            )


def mark_paid(payment_id: int, *, provider_payment_id: str | None = None) -> None:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE {Tables.payments}
                SET status = 'paid',
                    paid_at = NOW(),
                    provider = 'razorpay',
                    provider_payment_id = COALESCE(%s, provider_payment_id)
                WHERE id = %s
                """,
                (provider_payment_id, payment_id),
            )


def find_pending_for_user(user_id: int) -> dict[str, Any] | None:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, user_id, amount_cents, currency, status, provider,
                       provider_order_id, provider_payment_id, paid_at, created_at
                FROM {Tables.payments}
                WHERE user_id = %s AND status = 'pending'
                ORDER BY id DESC
                LIMIT 1
                """,
                (user_id,),
            )
            return cur.fetchone()


def list_all(*, limit: int = 200) -> list[dict[str, Any]]:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT p.id, p.user_id, p.amount_cents, p.currency, p.status,
                       p.provider, p.provider_order_id, p.provider_payment_id,
                       p.paid_at, p.created_at,
                       u.name AS user_name, u.email AS user_email, u.phone AS user_phone
                FROM {Tables.payments} p
                INNER JOIN {Tables.users} u ON u.id = p.user_id
                ORDER BY p.created_at DESC
                LIMIT %s
                """,
                (limit,),
            )
            return list(cur.fetchall())
