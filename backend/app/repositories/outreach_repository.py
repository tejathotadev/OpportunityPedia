"""Outreach messages and opportunity activity (Send Outreach)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.db.connection import connect_database
from app.db.schema import Tables


def _iso(value: Any) -> str:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).isoformat(timespec="seconds")
    return str(value)


def create_outreach(
    *,
    user_id: int,
    opportunity_id: str,
    opportunity_title: str | None,
    company_name: str | None,
    sender_email: str,
    sender_name: str | None,
    recipient_email: str,
    subject: str,
    body: str,
    channel: str,
    status: str,
    error_detail: str | None = None,
    matched_count: int | None = None,
    hiring_filters: dict[str, Any] | None = None,
) -> dict[str, Any]:
    from psycopg.types.json import Json

    values = (
        user_id,
        opportunity_id,
        opportunity_title,
        company_name,
        sender_email,
        sender_name,
        recipient_email,
        subject,
        body,
        channel or "email",
        status,
        error_detail,
    )
    with connect_database() as conn:
        with conn.cursor() as cur:
            try:
                cur.execute(
                    f"""
                    INSERT INTO {Tables.outreach_messages}
                        (user_id, opportunity_id, opportunity_title, company_name,
                         sender_email, sender_name, recipient_email, subject, body,
                         channel, status, error_detail, matched_count, hiring_filters)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, user_id, opportunity_id, opportunity_title, company_name,
                              sender_email, sender_name, recipient_email, subject, body,
                              channel, status, error_detail, matched_count, hiring_filters,
                              sent_at, created_at
                    """,
                    (
                        *values,
                        matched_count,
                        Json(hiring_filters) if hiring_filters is not None else None,
                    ),
                )
            except Exception:
                conn.rollback()
                cur.execute(
                    f"""
                    INSERT INTO {Tables.outreach_messages}
                        (user_id, opportunity_id, opportunity_title, company_name,
                         sender_email, sender_name, recipient_email, subject, body,
                         channel, status, error_detail)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, user_id, opportunity_id, opportunity_title, company_name,
                              sender_email, sender_name, recipient_email, subject, body,
                              channel, status, error_detail, sent_at, created_at
                    """,
                    values,
                )
            row = cur.fetchone()
    return _map_outreach(row)


def list_outreach_for_opportunity(
    *, user_id: int, opportunity_id: str, limit: int = 50
) -> list[dict[str, Any]]:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, user_id, opportunity_id, opportunity_title, company_name,
                       sender_email, sender_name, recipient_email, subject, body,
                       channel, status, error_detail, sent_at, created_at
                FROM {Tables.outreach_messages}
                WHERE user_id = %s AND opportunity_id = %s
                ORDER BY sent_at DESC
                LIMIT %s
                """,
                (user_id, opportunity_id, limit),
            )
            rows = cur.fetchall() or []
    return [_map_outreach(row) for row in rows]


def latest_sent_by_opportunity(*, user_id: int) -> dict[str, dict[str, Any]]:
    """opportunity_id → latest successful outreach row (for CRM fields on list)."""
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT DISTINCT ON (opportunity_id)
                       id, user_id, opportunity_id, opportunity_title, company_name,
                       sender_email, sender_name, recipient_email, subject, body,
                       channel, status, error_detail, sent_at, created_at
                FROM {Tables.outreach_messages}
                WHERE user_id = %s AND status = 'sent'
                ORDER BY opportunity_id, sent_at DESC
                """,
                (user_id,),
            )
            rows = cur.fetchall() or []
    return {str(row["opportunity_id"]): _map_outreach(row) for row in rows}


def create_activity(
    *,
    user_id: int,
    opportunity_id: str,
    opportunity_title: str | None,
    type: str,
    actor_id: int | None,
    actor_name: str,
    message: str,
    detail: str | None = None,
    channel: str | None = None,
    conn=None,
) -> dict[str, Any]:
    def _run(cur) -> dict[str, Any]:
        cur.execute(
            f"""
            INSERT INTO {Tables.opportunity_activities}
                (user_id, opportunity_id, opportunity_title, type,
                 actor_id, actor_name, message, detail, channel)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, user_id, opportunity_id, opportunity_title, type,
                      actor_id, actor_name, message, detail, channel, created_at
            """,
            (
                user_id,
                opportunity_id,
                opportunity_title,
                type,
                actor_id,
                actor_name,
                message,
                detail,
                channel,
            ),
        )
        row = cur.fetchone()
        return _map_activity(row)

    if conn is not None:
        with conn.cursor() as cur:
            return _run(cur)
    with connect_database() as owned:
        with owned.cursor() as cur:
            return _run(cur)


def list_activity_for_opportunity(
    *, user_id: int, opportunity_id: str, limit: int = 50
) -> list[dict[str, Any]]:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, user_id, opportunity_id, opportunity_title, type,
                       actor_id, actor_name, message, detail, channel, created_at
                FROM {Tables.opportunity_activities}
                WHERE user_id = %s AND opportunity_id = %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (user_id, opportunity_id, limit),
            )
            rows = cur.fetchall() or []
    return [_map_activity(row) for row in rows]


def list_team_activity(*, user_id: int, limit: int = 20) -> list[dict[str, Any]]:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, user_id, opportunity_id, opportunity_title, type,
                       actor_id, actor_name, message, detail, channel, created_at
                FROM {Tables.opportunity_activities}
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (user_id, limit),
            )
            rows = cur.fetchall() or []
    return [_map_activity(row) for row in rows]


def _map_outreach(row: dict[str, Any]) -> dict[str, Any]:
    filters = row.get("hiring_filters")
    if isinstance(filters, str):
        try:
            import json

            filters = json.loads(filters)
        except Exception:
            filters = None
    return {
        "id": str(row["id"]),
        "opportunityId": str(row["opportunity_id"]),
        "senderId": str(row["user_id"]),
        "senderName": row.get("sender_name") or "User",
        "senderEmail": row["sender_email"],
        "recipientEmail": row["recipient_email"],
        "subject": row["subject"],
        "body": row["body"],
        "channel": row.get("channel") or "email",
        "status": row.get("status") or "sent",
        "sentAt": _iso(row.get("sent_at") or row.get("created_at")),
        "opportunityTitle": row.get("opportunity_title"),
        "companyName": row.get("company_name"),
        "matchedCount": row.get("matched_count"),
        "hiringFilters": filters if isinstance(filters, dict) else None,
    }


def _map_activity(row: dict[str, Any]) -> dict[str, Any]:
    actor_id = row.get("actor_id")
    return {
        "id": str(row["id"]),
        "opportunityId": str(row["opportunity_id"]),
        "type": row["type"],
        "actorId": str(actor_id) if actor_id is not None else None,
        "actorName": row.get("actor_name") or "System",
        "message": row["message"],
        "detail": row.get("detail"),
        "createdAt": _iso(row.get("created_at")),
        "channel": row.get("channel"),
        "opportunityTitle": row.get("opportunity_title"),
    }
