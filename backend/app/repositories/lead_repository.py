from __future__ import annotations

from typing import Any

from app.db.connection import connect_database
from app.db.schema import Tables


def create_lead(
    *,
    name: str,
    email: str,
    company: str | None,
    phone: str | None,
    job_title: str | None,
    reason: str,
    message: str,
) -> int:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                INSERT INTO {Tables.contact_leads}
                    (name, email, company, phone, job_title, reason, message, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, 'new')
                RETURNING id
                """,
                (
                    name.strip(),
                    email.strip().lower(),
                    (company or "").strip() or None,
                    (phone or "").strip() or None,
                    (job_title or "").strip() or None,
                    reason.strip(),
                    message.strip(),
                ),
            )
            row = cur.fetchone()
            return int(row["id"])


def list_leads(*, limit: int = 200, status: str | None = None) -> list[dict[str, Any]]:
    with connect_database() as conn:
        with conn.cursor() as cur:
            if status:
                cur.execute(
                    f"""
                    SELECT id, name, email, company, phone, job_title, reason, message,
                           status, assigned_admin_id, admin_notes, converted_user_id,
                           created_at, updated_at
                    FROM {Tables.contact_leads}
                    WHERE status = %s
                    ORDER BY created_at DESC
                    LIMIT %s
                    """,
                    (status, limit),
                )
            else:
                cur.execute(
                    f"""
                    SELECT id, name, email, company, phone, job_title, reason, message,
                           status, assigned_admin_id, admin_notes, converted_user_id,
                           created_at, updated_at
                    FROM {Tables.contact_leads}
                    ORDER BY created_at DESC
                    LIMIT %s
                    """,
                    (limit,),
                )
            return list(cur.fetchall())


def update_lead(
    *,
    lead_id: int,
    status: str,
    admin_notes: str | None = None,
    assigned_admin_id: int | None = None,
) -> dict[str, Any] | None:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE {Tables.contact_leads}
                SET status = %s,
                    admin_notes = COALESCE(%s, admin_notes),
                    assigned_admin_id = COALESCE(%s, assigned_admin_id)
                WHERE id = %s
                RETURNING id, name, email, company, phone, job_title, reason, message,
                          status, assigned_admin_id, admin_notes, converted_user_id,
                          created_at, updated_at
                """,
                (status, admin_notes, assigned_admin_id, lead_id),
            )
            return cur.fetchone()
