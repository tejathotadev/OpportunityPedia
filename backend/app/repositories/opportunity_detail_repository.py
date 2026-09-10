"""Persisted SAM notice detail captured at scan time (Plan A — no extra SAM calls).

Radar list rows stay in-memory, but detail (contact, facts, attachment names)
is upserted here so logout/login and process restarts still have the drawer
payload after the next list load / hydrate.
"""

from __future__ import annotations

import json
from typing import Any

from psycopg.types.json import Json

from app.db.connection import connect_database
from app.db.schema import Tables


def upsert_details(user_id: int, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    with connect_database() as conn:
        with conn.cursor() as cur:
            for row in rows:
                notice_id = str(row.get("notice_id") or "").strip()
                if not notice_id:
                    continue
                detail = row.get("detail") or {}
                if not isinstance(detail, dict):
                    detail = {}
                cur.execute(
                    f"""
                    INSERT INTO {Tables.opportunity_details}
                        (user_id, notice_id, title, provider, board_token, board_name,
                         location, department, url, posted_at, deadline, requisition_id,
                         heat, signal_type, naics, category, detail)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (user_id, notice_id) DO UPDATE SET
                        title = EXCLUDED.title,
                        provider = EXCLUDED.provider,
                        board_token = EXCLUDED.board_token,
                        board_name = EXCLUDED.board_name,
                        location = EXCLUDED.location,
                        department = EXCLUDED.department,
                        url = EXCLUDED.url,
                        posted_at = EXCLUDED.posted_at,
                        deadline = EXCLUDED.deadline,
                        requisition_id = EXCLUDED.requisition_id,
                        heat = EXCLUDED.heat,
                        signal_type = EXCLUDED.signal_type,
                        naics = EXCLUDED.naics,
                        category = EXCLUDED.category,
                        detail = EXCLUDED.detail,
                        updated_at = now()
                    """,
                    (
                        user_id,
                        notice_id,
                        (row.get("title") or "")[:512] or None,
                        row.get("provider"),
                        row.get("board_token"),
                        row.get("board_name"),
                        row.get("location"),
                        row.get("department"),
                        row.get("url"),
                        row.get("posted_at"),
                        row.get("deadline"),
                        row.get("requisition_id"),
                        row.get("heat"),
                        row.get("signal_type"),
                        row.get("naics"),
                        row.get("category"),
                        Json(detail),
                    ),
                )


def list_for_user(user_id: int, *, limit: int = 2000) -> list[dict[str, Any]]:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT notice_id, title, provider, board_token, board_name, location,
                       department, url, posted_at, deadline, requisition_id, heat,
                       signal_type, naics, category, detail, updated_at, created_at
                FROM {Tables.opportunity_details}
                WHERE user_id = %s
                ORDER BY updated_at DESC
                LIMIT %s
                """,
                (user_id, limit),
            )
            rows = cur.fetchall() or []
    return [_normalize(row) for row in rows]


def get_for_user(user_id: int, notice_id: str) -> dict[str, Any] | None:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT notice_id, title, provider, board_token, board_name, location,
                       department, url, posted_at, deadline, requisition_id, heat,
                       signal_type, naics, category, detail, updated_at, created_at
                FROM {Tables.opportunity_details}
                WHERE user_id = %s AND notice_id = %s
                LIMIT 1
                """,
                (user_id, notice_id),
            )
            row = cur.fetchone()
    return _normalize(row) if row else None


def _normalize(row: dict[str, Any]) -> dict[str, Any]:
    detail = row.get("detail")
    if isinstance(detail, str):
        try:
            detail = json.loads(detail)
        except json.JSONDecodeError:
            detail = {}
    if not isinstance(detail, dict):
        detail = {}
    return {
        "external_job_id": row.get("notice_id"),
        "title": row.get("title"),
        "provider": row.get("provider") or "sam_gov",
        "board_token": row.get("board_token"),
        "board_name": row.get("board_name"),
        "location": row.get("location"),
        "department": row.get("department"),
        "url": row.get("url"),
        "posted_at": row.get("posted_at"),
        "updated_at": row.get("deadline") or row.get("updated_at"),
        "requisition_id": row.get("requisition_id"),
        "heat": row.get("heat") or "VERY_HOT",
        "signal_type": row.get("signal_type") or "GOVERNMENT_STAFFING",
        "naics": row.get("naics"),
        "category": row.get("category"),
        "detail": detail,
        "created_at": row.get("created_at"),
    }
