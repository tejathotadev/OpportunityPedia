"""Persisted commercial company rollups (no job openings).

Stores company name, totals, facet counts, and compact facet atoms so Focus
outreach filters still work after logout / process restart.
"""

from __future__ import annotations

import json
from typing import Any

from psycopg.types.json import Json

from app.db.connection import connect_database
from app.db.schema import Tables


def replace_for_user(user_id: int, rows: list[dict[str, Any]]) -> None:
    """Upsert current commercial companies and drop stale ones for this user."""
    with connect_database() as conn:
        with conn.cursor() as cur:
            keep_ids: list[str] = []
            for row in rows:
                company_id = str(row.get("company_id") or "").strip()
                if not company_id:
                    continue
                keep_ids.append(company_id)
                cur.execute(
                    f"""
                    INSERT INTO {Tables.company_hiring_signals}
                        (user_id, company_id, company_name, total_openings,
                         highest_temperature, very_hot, hot, industry, location,
                         country, team_breakdown, facets, atoms, last_detected_at,
                         scanned_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now())
                    ON CONFLICT (user_id, company_id) DO UPDATE SET
                        company_name = EXCLUDED.company_name,
                        total_openings = EXCLUDED.total_openings,
                        highest_temperature = EXCLUDED.highest_temperature,
                        very_hot = EXCLUDED.very_hot,
                        hot = EXCLUDED.hot,
                        industry = EXCLUDED.industry,
                        location = EXCLUDED.location,
                        country = EXCLUDED.country,
                        team_breakdown = EXCLUDED.team_breakdown,
                        facets = EXCLUDED.facets,
                        atoms = EXCLUDED.atoms,
                        last_detected_at = EXCLUDED.last_detected_at,
                        scanned_at = now(),
                        updated_at = now()
                    """,
                    (
                        user_id,
                        company_id,
                        str(row.get("company_name") or company_id)[:256],
                        int(row.get("total_openings") or 0),
                        str(row.get("highest_temperature") or "hot"),
                        int(row.get("very_hot") or 0),
                        int(row.get("hot") or 0),
                        row.get("industry"),
                        row.get("location"),
                        row.get("country"),
                        Json(row.get("team_breakdown") or []),
                        Json(row.get("facets") or {}),
                        Json(row.get("atoms") or []),
                        row.get("last_detected_at"),
                    ),
                )

            if keep_ids:
                placeholders = ", ".join(["%s"] * len(keep_ids))
                cur.execute(
                    f"""
                    DELETE FROM {Tables.company_hiring_signals}
                    WHERE user_id = %s AND company_id NOT IN ({placeholders})
                    """,
                    (user_id, *keep_ids),
                )
            else:
                cur.execute(
                    f"""
                    DELETE FROM {Tables.company_hiring_signals}
                    WHERE user_id = %s
                    """,
                    (user_id,),
                )


def list_for_user(user_id: int, *, limit: int = 500) -> list[dict[str, Any]]:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT company_id, company_name, total_openings, highest_temperature,
                       very_hot, hot, industry, location, country, team_breakdown,
                       facets, atoms, last_detected_at, scanned_at, updated_at
                FROM {Tables.company_hiring_signals}
                WHERE user_id = %s
                ORDER BY total_openings DESC, company_name ASC
                LIMIT %s
                """,
                (user_id, limit),
            )
            rows = cur.fetchall() or []
    return [_normalize(row) for row in rows]


def get_for_user(user_id: int, company_id: str) -> dict[str, Any] | None:
    token = str(company_id or "").strip()
    if token.startswith("company:"):
        token = token.split(":", 1)[1]
    if not token:
        return None
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT company_id, company_name, total_openings, highest_temperature,
                       very_hot, hot, industry, location, country, team_breakdown,
                       facets, atoms, last_detected_at, scanned_at, updated_at
                FROM {Tables.company_hiring_signals}
                WHERE user_id = %s AND company_id = %s
                LIMIT 1
                """,
                (user_id, token),
            )
            row = cur.fetchone()
    return _normalize(row) if row else None


def _as_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else []
        except Exception:
            return []
    return []


def _as_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}
    return {}


def _normalize(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "company_id": str(row.get("company_id") or ""),
        "company_name": str(row.get("company_name") or ""),
        "total_openings": int(row.get("total_openings") or 0),
        "highest_temperature": str(row.get("highest_temperature") or "hot"),
        "very_hot": int(row.get("very_hot") or 0),
        "hot": int(row.get("hot") or 0),
        "industry": row.get("industry") or "Hiring",
        "location": row.get("location") or "—",
        "country": row.get("country") or "OTHER",
        "team_breakdown": _as_list(row.get("team_breakdown")),
        "facets": _as_dict(row.get("facets")),
        "atoms": _as_list(row.get("atoms")),
        "last_detected_at": row.get("last_detected_at"),
        "scanned_at": row.get("scanned_at"),
        "updated_at": row.get("updated_at"),
    }
