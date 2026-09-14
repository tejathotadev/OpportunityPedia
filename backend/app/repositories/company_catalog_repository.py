"""Shared commercial company catalog (labels stored once)."""

from __future__ import annotations

import json
from typing import Any

from psycopg.types.json import Json

from app.db.connection import connect_database
from app.db.schema import Tables


def upsert_snapshots(rows: list[dict[str, Any]]) -> None:
    """Insert/update company name + team mix without overwriting labels."""
    if not rows:
        return
    with connect_database() as conn:
        with conn.cursor() as cur:
            for row in rows:
                company_id = str(row.get("company_id") or "").strip()
                if not company_id:
                    continue
                cur.execute(
                    f"""
                    INSERT INTO {Tables.companies}
                        (company_id, company_name, team_breakdown)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (company_id) DO UPDATE SET
                        company_name = EXCLUDED.company_name,
                        team_breakdown = EXCLUDED.team_breakdown,
                        updated_at = now()
                    """,
                    (
                        company_id,
                        str(row.get("company_name") or company_id)[:256],
                        Json(row.get("team_breakdown") or []),
                    ),
                )


def map_by_ids(company_ids: list[str]) -> dict[str, dict[str, Any]]:
    ids = [str(i).strip() for i in company_ids if str(i).strip()]
    if not ids:
        return {}
    with connect_database() as conn:
        with conn.cursor() as cur:
            placeholders = ", ".join(["%s"] * len(ids))
            cur.execute(
                f"""
                SELECT company_id, company_name, company_type, tier, industry,
                       team_breakdown, classified_at, classification_model
                FROM {Tables.companies}
                WHERE company_id IN ({placeholders})
                """,
                tuple(ids),
            )
            return {str(row["company_id"]): dict(row) for row in cur.fetchall()}


def list_unclassified(*, limit: int = 40, include_heuristic: bool = False) -> list[dict[str, Any]]:
    with connect_database() as conn:
        with conn.cursor() as cur:
            if include_heuristic:
                cur.execute(
                    f"""
                    SELECT company_id, company_name, team_breakdown, classification_model
                    FROM {Tables.companies}
                    WHERE classified_at IS NULL
                       OR classification_model IS NULL
                       OR classification_model = 'heuristic'
                    ORDER BY
                      CASE WHEN classified_at IS NULL THEN 0 ELSE 1 END,
                      updated_at DESC
                    LIMIT %s
                    """,
                    (limit,),
                )
            else:
                cur.execute(
                    f"""
                    SELECT company_id, company_name, team_breakdown, classification_model
                    FROM {Tables.companies}
                    WHERE classified_at IS NULL
                    ORDER BY updated_at DESC
                    LIMIT %s
                    """,
                    (limit,),
                )
            return [dict(row) for row in cur.fetchall()]


def save_classification(
    company_id: str,
    *,
    company_type: str,
    tier: str,
    industry: str,
    model: str,
) -> None:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE {Tables.companies}
                SET company_type = %s,
                    tier = %s,
                    industry = %s,
                    classified_at = now(),
                    classification_model = %s,
                    updated_at = now()
                WHERE company_id = %s
                """,
                (company_type, tier, industry, model[:120], company_id),
            )


def distinct_industries() -> list[str]:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT DISTINCT industry
                FROM {Tables.companies}
                WHERE industry IS NOT NULL AND industry <> ''
                ORDER BY industry ASC
                """
            )
            return [str(row["industry"]) for row in cur.fetchall()]


def parse_team_breakdown(raw: Any) -> list[dict[str, Any]]:
    if isinstance(raw, list):
        return raw
    if isinstance(raw, str):
        try:
            data = json.loads(raw)
            return data if isinstance(data, list) else []
        except Exception:
            return []
    return []
