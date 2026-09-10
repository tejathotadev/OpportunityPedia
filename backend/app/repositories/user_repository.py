from __future__ import annotations

from typing import Any

from app.db.connection import connect_database
from app.db.schema import Tables


def find_by_email(email: str) -> dict[str, Any] | None:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, role, name, email, phone, company, password_hash, status,
                       is_demo, last_login_at, created_at, updated_at
                FROM {Tables.users}
                WHERE lower(email::text) = lower(%s)
                LIMIT 1
                """,
                (email.strip(),),
            )
            return cur.fetchone()


def find_by_id(user_id: int) -> dict[str, Any] | None:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, role, name, email, phone, company, password_hash, status,
                       is_demo, last_login_at, created_at, updated_at
                FROM {Tables.users}
                WHERE id = %s
                LIMIT 1
                """,
                (user_id,),
            )
            return cur.fetchone()


def insert_admin(*, name: str, email: str, password_hash: str) -> int:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                INSERT INTO {Tables.users}
                    (role, name, email, phone, company, password_hash, status, is_demo)
                VALUES ('platform_admin', %s, %s, '', NULL, %s, 'active', FALSE)
                RETURNING id
                """,
                (name.strip(), email.strip().lower(), password_hash),
            )
            row = cur.fetchone()
            return int(row["id"])


def insert_customer(*, name: str, email: str, phone: str, company: str | None) -> int:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                INSERT INTO {Tables.users}
                    (role, name, email, phone, company, password_hash, status, is_demo)
                VALUES ('customer', %s, %s, %s, %s, NULL, 'pending', FALSE)
                RETURNING id
                """,
                (
                    name.strip(),
                    email.strip().lower(),
                    phone.strip(),
                    (company or "").strip() or None,
                ),
            )
            row = cur.fetchone()
            return int(row["id"])


def insert_active_customer(
    *,
    name: str,
    email: str,
    phone: str,
    company: str | None,
    password_hash: str | None = None,
) -> int:
    """Admin-provisioned customer (password optional until set-password email)."""
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                INSERT INTO {Tables.users}
                    (role, name, email, phone, company, password_hash, status, is_demo)
                VALUES ('customer', %s, %s, %s, %s, %s, 'active', FALSE)
                RETURNING id
                """,
                (
                    name.strip(),
                    email.strip().lower(),
                    (phone or "").strip(),
                    (company or "").strip() or None,
                    password_hash,
                ),
            )
            row = cur.fetchone()
            return int(row["id"])


def upsert_seed_user(
    *,
    email: str,
    password_hash: str,
    name: str,
    company: str | None,
    role: str,
    status: str,
    is_demo: bool = False,
) -> int:
    existing = find_by_email(email)
    if existing:
        with connect_database() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    UPDATE {Tables.users}
                    SET name = %s,
                        company = %s,
                        password_hash = %s,
                        role = %s,
                        status = %s,
                        is_demo = %s
                    WHERE id = %s
                    """,
                    (
                        name.strip(),
                        (company or "").strip() or None,
                        password_hash,
                        role,
                        status,
                        is_demo,
                        int(existing["id"]),
                    ),
                )
        return int(existing["id"])

    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                INSERT INTO {Tables.users}
                    (role, name, email, phone, company, password_hash, status, is_demo)
                VALUES (%s, %s, %s, '', %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    role,
                    name.strip(),
                    email.strip().lower(),
                    (company or "").strip() or None,
                    password_hash,
                    status,
                    is_demo,
                ),
            )
            row = cur.fetchone()
            return int(row["id"])


def update_customer_profile(
    *,
    user_id: int,
    name: str,
    phone: str,
    company: str | None,
) -> None:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE {Tables.users}
                SET name = %s, phone = %s, company = %s
                WHERE id = %s AND role = 'customer'
                """,
                (name.strip(), phone.strip(), (company or "").strip() or None, user_id),
            )


def list_customers(*, limit: int = 200) -> list[dict[str, Any]]:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, name, email, phone, company, status, is_demo,
                       last_login_at, created_at
                FROM {Tables.users}
                WHERE role = 'customer'
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (limit,),
            )
            return list(cur.fetchall())


def set_customer_status(user_id: int, status: str) -> None:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE {Tables.users}
                SET status = %s
                WHERE id = %s AND role = 'customer'
                """,
                (status, user_id),
            )


def update_admin_credentials(*, email: str, name: str, password_hash: str) -> None:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE {Tables.users}
                SET name = %s, password_hash = %s, role = 'platform_admin',
                    status = 'active', is_demo = FALSE
                WHERE lower(email::text) = lower(%s)
                """,
                (name.strip(), password_hash, email.strip()),
            )


def set_password_hash(user_id: int, password_hash: str) -> None:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE {Tables.users}
                SET password_hash = %s, status = 'active'
                WHERE id = %s AND role = 'customer'
                """,
                (password_hash, user_id),
            )


def touch_last_login(user_id: int) -> None:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE {Tables.users}
                SET last_login_at = NOW()
                WHERE id = %s
                """,
                (user_id,),
            )
