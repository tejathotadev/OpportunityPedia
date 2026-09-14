"""One-shot Gemini labeling for commercial companies.

Radar persists hiring signals; this module labels each company at most once
(when classified_at is null). Never invoked per Opportunities page load for
already-labeled rows.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

import httpx

from app.core.config import settings
from app.repositories import company_catalog_repository

logger = logging.getLogger(__name__)

COMPANY_TYPES = ("product", "service", "mixed", "unknown")
TIERS = ("mnc", "tier1", "tier2", "startup", "unknown")

INDUSTRIES = (
    "AI / Machine Learning",
    "SaaS / Software",
    "Developer Tools",
    "Data / Analytics",
    "Fintech",
    "Cybersecurity",
    "Healthtech",
    "E-commerce / Marketplace",
    "Climate / Energy",
    "Media / Communications",
    "Hardware / Robotics",
    "HR / Recruiting Tech",
    "Other",
)

_INDUSTRY_LOOKUP = {name.lower(): name for name in INDUSTRIES}


def _teams_blob(teams: list[dict[str, Any]]) -> str:
    parts: list[str] = []
    for item in teams[:12]:
        name = str(item.get("name") or "").strip()
        if not name:
            continue
        count = item.get("count")
        parts.append(f"{name} ({count})" if count is not None else name)
    return ", ".join(parts) if parts else "n/a"


def _normalize_type(value: Any) -> str:
    raw = str(value or "").strip().lower().replace(" ", "_")
    if raw in COMPANY_TYPES:
        return raw
    if "product" in raw:
        return "product"
    if "service" in raw:
        return "service"
    if "mix" in raw:
        return "mixed"
    return "unknown"


def _normalize_tier(value: Any) -> str:
    raw = str(value or "").strip().lower().replace(" ", "").replace("-", "").replace("_", "")
    mapping = {
        "mnc": "mnc",
        "multinational": "mnc",
        "tier1": "tier1",
        "t1": "tier1",
        "tier2": "tier2",
        "t2": "tier2",
        "startup": "startup",
        "earlystage": "startup",
    }
    return mapping.get(raw, "unknown")


def _normalize_industry(value: Any) -> str:
    text = str(value or "").strip()
    if not text:
        return "Other"
    hit = _INDUSTRY_LOOKUP.get(text.lower())
    if hit:
        return hit
    for name in INDUSTRIES:
        if name.lower() in text.lower() or text.lower() in name.lower():
            return name
    return "Other"


def _extract_json(text: str) -> dict[str, Any] | None:
    raw = text.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else None
    except Exception:
        match = re.search(r"\{[\s\S]*\}", raw)
        if not match:
            return None
        try:
            data = json.loads(match.group(0))
            return data if isinstance(data, dict) else None
        except Exception:
            return None


def _heuristic(company_name: str, teams: list[dict[str, Any]]) -> dict[str, str]:
    """Offline fallback when Gemini is unavailable."""
    blob = f"{company_name} {_teams_blob(teams)}".lower()
    industry = "Other"
    for name in INDUSTRIES[:-1]:
        key = name.split("/")[0].strip().lower()
        if key and key in blob:
            industry = name
            break
    if any(k in blob for k in ("ai", "ml", "llm", "model")):
        industry = "AI / Machine Learning"
    company_type = "product"
    if any(k in blob for k in ("consult", "staffing", "agency", "services")):
        company_type = "service"
    tier = "startup"
    if any(k in blob for k in ("microsoft", "google", "amazon", "meta", "ibm", "oracle")):
        tier = "mnc"
    return {
        "company_type": company_type,
        "tier": tier,
        "industry": industry,
    }


def _classify_one(company: dict[str, Any]) -> dict[str, str]:
    name = str(company.get("company_name") or company.get("company_id") or "")
    teams = company_catalog_repository.parse_team_breakdown(
        company.get("team_breakdown")
    )
    if not settings.GEMINI_API_KEY:
        return _heuristic(name, teams)

    prompt = f"""Classify this employer for a B2B opportunity product.
Return ONLY compact JSON with keys company_type, tier, industry.

company_type must be one of: {", ".join(COMPANY_TYPES)}
tier must be one of: {", ".join(TIERS)}
industry must be exactly one of: {", ".join(INDUSTRIES)}

Use hiring team mix as a strong signal for industry.
Company name: {name}
Hiring teams: {_teams_blob(teams)}
"""
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.GEMINI_MODEL}:generateContent"
    )
    try:
        with httpx.Client(timeout=25.0) as client:
            response = client.post(
                url,
                params={"key": settings.GEMINI_API_KEY},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.1,
                        "responseMimeType": "application/json",
                    },
                },
            )
            response.raise_for_status()
            payload = response.json()
        text = (
            payload.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
        )
        parsed = _extract_json(text) or {}
        return {
            "company_type": _normalize_type(parsed.get("company_type")),
            "tier": _normalize_tier(parsed.get("tier")),
            "industry": _normalize_industry(parsed.get("industry")),
        }
    except Exception:
        logger.exception("Gemini classify failed for %s — using heuristic", name)
        return _heuristic(name, teams)


def sync_from_hiring_rows(rows: list[dict[str, Any]]) -> None:
    """Upsert catalog rows from hiring snapshots (no LLM)."""
    snapshots = [
        {
            "company_id": row.get("company_id") or row.get("companyId"),
            "company_name": row.get("company_name") or row.get("companyName"),
            "team_breakdown": row.get("team_breakdown") or row.get("teamBreakdown") or [],
        }
        for row in rows
        if row.get("company_id") or row.get("companyId")
    ]
    company_catalog_repository.upsert_snapshots(snapshots)


def classify_pending(*, limit: int = 40, use_gemini: bool = True) -> int:
    """Label companies. Heuristic fills gaps instantly; Gemini upgrades after Radar."""
    pending = company_catalog_repository.list_unclassified(
        limit=limit,
        include_heuristic=use_gemini and bool(settings.GEMINI_API_KEY),
    )
    if not pending:
        return 0
    allow_gemini = use_gemini and bool(settings.GEMINI_API_KEY)
    done = 0
    for company in pending:
        if allow_gemini:
            labels = _classify_one(company)
            model = settings.GEMINI_MODEL
        else:
            name = str(company.get("company_name") or company.get("company_id") or "")
            teams = company_catalog_repository.parse_team_breakdown(
                company.get("team_breakdown")
            )
            labels = _heuristic(name, teams)
            model = "heuristic"
        company_catalog_repository.save_classification(
            str(company["company_id"]),
            company_type=labels["company_type"],
            tier=labels["tier"],
            industry=labels["industry"],
            model=model,
        )
        done += 1
    return done


def sync_and_classify_from_hiring_rows(
    rows: list[dict[str, Any]], *, use_gemini: bool = True
) -> int:
    sync_from_hiring_rows(rows)
    return classify_pending(limit=max(40, len(rows)), use_gemini=use_gemini)
