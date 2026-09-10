"""Opportunity heat lanes: VERY_HOT (buying) vs HOT (hiring).

Heat is about the signal, not the API name. ATS jobs default to HOT.
Procurement / funding sources will default to VERY_HOT when added.
"""

from __future__ import annotations

from typing import Any

HEAT_VERY_HOT = "VERY_HOT"
HEAT_HOT = "HOT"

SIGNAL_JOB_OPENING = "JOB_OPENING"
SIGNAL_GOVERNMENT_TENDER = "GOVERNMENT_TENDER"
SIGNAL_GOVERNMENT_STAFFING = "GOVERNMENT_STAFFING"
SIGNAL_CONTRACT_AWARD = "CONTRACT_AWARD"
SIGNAL_FUNDING = "FUNDING"
SIGNAL_EXPANSION = "EXPANSION"
SIGNAL_ACQUISITION = "ACQUISITION"
SIGNAL_PROCUREMENT = "PROCUREMENT"
SIGNAL_GENERAL = "GENERAL"

# NAICS 5613 Employment Services — the only codes the radar tracks.
NAICS_CATEGORIES: dict[str, str] = {
    "561311": "Employment Placement",
    "561312": "Executive Search",
    "561320": "Temporary Help",
    "561330": "PEO / Co-employment",
}


def category_for_naics(naics: str | None) -> str | None:
    """Human-readable staffing category for a six-digit NAICS code."""
    if not naics:
        return None
    return NAICS_CATEGORIES.get(str(naics).strip()[:6])

_COLLECTOR_DEFAULTS: dict[str, dict[str, str]] = {
    "greenhouse": {"heat": HEAT_HOT, "signal_type": SIGNAL_JOB_OPENING},
    "lever": {"heat": HEAT_HOT, "signal_type": SIGNAL_JOB_OPENING},
    "ashby": {"heat": HEAT_HOT, "signal_type": SIGNAL_JOB_OPENING},
    "jobs_api": {"heat": HEAT_HOT, "signal_type": SIGNAL_JOB_OPENING},
    "sam_gov": {"heat": HEAT_VERY_HOT, "signal_type": SIGNAL_GOVERNMENT_STAFFING},
    "usaspending": {"heat": HEAT_VERY_HOT, "signal_type": SIGNAL_CONTRACT_AWARD},
    "sec_edgar": {"heat": HEAT_VERY_HOT, "signal_type": SIGNAL_GENERAL},
}


def classify_by_collector(collector: str) -> dict[str, str]:
    key = (collector or "").strip().lower()
    defaults = _COLLECTOR_DEFAULTS.get(key)
    if defaults:
        return dict(defaults)
    return {"heat": HEAT_HOT, "signal_type": SIGNAL_GENERAL}


def group_companies_by_heat(jobs: list[dict[str, Any]]) -> dict[str, Any]:
    """Build Very Hot / Hot company lists from flat job/tender rows."""
    buckets: dict[str, dict[str, dict[str, Any]]] = {
        HEAT_VERY_HOT: {},
        HEAT_HOT: {},
    }
    for job in jobs:
        heat = str(job.get("heat") or HEAT_HOT).upper()
        if heat not in buckets:
            heat = HEAT_HOT
        token = str(job.get("board_token") or job.get("board_name") or "unknown")
        company = buckets[heat].get(token)
        if not company:
            company = {
                "board_token": token,
                "board_name": job.get("board_name") or token,
                "provider": job.get("provider"),
                "heat": heat,
                "signal_count": 0,
                "signal_types": set(),
                "categories": set(),
            }
            buckets[heat][token] = company
        company["signal_count"] += 1
        signal_type = job.get("signal_type")
        if signal_type:
            company["signal_types"].add(str(signal_type))
        category = job.get("category")
        if category:
            company["categories"].add(str(category))

    def _lane(heat: str) -> dict[str, Any]:
        companies = []
        category_counts: dict[str, int] = {}
        for item in buckets[heat].values():
            companies.append(
                {
                    "board_token": item["board_token"],
                    "board_name": item["board_name"],
                    "provider": item["provider"],
                    "heat": item["heat"],
                    "signal_count": item["signal_count"],
                    "signal_types": sorted(item["signal_types"]),
                    "categories": sorted(item["categories"]),
                }
            )
        for job in jobs:
            if str(job.get("heat") or HEAT_HOT).upper() != heat:
                continue
            category = job.get("category")
            if category:
                category_counts[str(category)] = category_counts.get(str(category), 0) + 1
        companies.sort(key=lambda c: (-c["signal_count"], str(c["board_name"]).lower()))
        categories = [
            {"category": name, "count": count}
            for name, count in sorted(category_counts.items(), key=lambda kv: (-kv[1], kv[0]))
        ]
        return {
            "companies": companies,
            "company_count": len(companies),
            "categories": categories,
        }

    return {
        HEAT_VERY_HOT: _lane(HEAT_VERY_HOT),
        HEAT_HOT: _lane(HEAT_HOT),
    }


def match_vendors_to_tenders(
    tenders: list[dict[str, Any]], vendors: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Attach suggested vendors to tenders (agency / NAICS / keyword overlap)."""
    enriched: list[dict[str, Any]] = []
    for tender in tenders:
        suggestions: list[dict[str, Any]] = []
        t_agency = str(tender.get("agency_name") or tender.get("board_name") or "").lower()
        t_naics = str(tender.get("naics") or "")
        t_category = str(tender.get("category") or "")
        t_title = str(tender.get("title") or "").lower()
        for vendor in vendors:
            score = 0
            v_agency = str(vendor.get("agency_name") or "").lower()
            v_naics = str(vendor.get("naics") or "")
            v_category = str(vendor.get("category") or "")
            v_title = str(vendor.get("award_title") or vendor.get("title") or "").lower()
            if t_agency and v_agency and (t_agency in v_agency or v_agency in t_agency):
                score += 3
            if t_naics and v_naics and t_naics == v_naics:
                score += 3
            elif t_category and v_category and t_category == v_category:
                score += 2
            # Shared staffing token overlap.
            for phrase in _STAFFING_OVERLAP:
                if phrase in t_title and phrase in v_title:
                    score += 1
            if score <= 0:
                continue
            suggestions.append({**vendor, "match_score": score})
        suggestions.sort(key=lambda v: (-int(v.get("match_score") or 0), v.get("vendor_name") or ""))
        row = dict(tender)
        row["suggested_vendors"] = suggestions[:8]
        enriched.append(row)
    return enriched


_STAFFING_OVERLAP = (
    "staffing",
    "temporary",
    "recruitment",
    "contingent",
    "personnel",
    "workforce",
)
