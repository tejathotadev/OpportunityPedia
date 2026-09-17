"""Business rules for admin-curated opportunities."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status

from app.repositories import curated_opportunity_repository, user_repository

COMMERCIAL_TYPES = {
    "hiring_requirement",
    "c2c_requirement",
    "vendor_requirement",
    "vendor_partnership",
    "contract_staffing",
    "w2_requirement",
    "other",
}

GOVERNMENT_TYPES = {
    "government_tender",
    "procurement",
    "rfp",
    "other",
}

ALLOWED_PRIORITIES = {"very_hot"}
# Vendors / curated opportunities are always Very Hot (never Hot).
DEFAULT_PRIORITY = "very_hot"

# Maps curated opportunity_type → OP frontend Opportunity.type
_TYPE_TO_OP: dict[str, str] = {
    "hiring_requirement": "hiring",
    "c2c_requirement": "hiring",
    "contract_staffing": "hiring",
    "w2_requirement": "hiring",
    "vendor_requirement": "vendor_requirement",
    "vendor_partnership": "partnership",
    "government_tender": "rfp",
    "procurement": "procurement",
    "rfp": "rfp",
    "other": "other",
}


def _parse_detected_at(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if not value:
        return datetime.now(timezone.utc)
    text = str(value).strip()
    try:
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"
        dt = datetime.fromisoformat(text)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="detected_at must be a valid date",
        ) from exc


def _clean_str_list(value: Any) -> list[str]:
    if not value:
        return []
    if isinstance(value, str):
        parts = [p.strip() for p in value.replace(";", ",").split(",")]
        return [p for p in parts if p]
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    return []


def _validate_workspaces(workspace_ids: list[int]) -> list[int]:
    cleaned = sorted({int(x) for x in workspace_ids if x is not None})
    if not cleaned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Select at least one workspace (customer) who can see this opportunity",
        )
    valid: list[int] = []
    for wid in cleaned:
        user = user_repository.find_by_id(wid)
        if not user or user.get("role") != "customer":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid customer workspace id: {wid}",
            )
        if str(user.get("status") or "") == "removed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Customer {wid} is removed",
            )
        # Prefer owner ids; if a member id is passed, resolve to workspace owner.
        seat = str(user.get("seat_role") or "owner").lower()
        if seat == "member":
            owner_id = int(user.get("workspace_id") or user["id"])
            valid.append(owner_id)
        else:
            valid.append(int(user["id"]))
    return sorted(set(valid))


def _normalize_fields(body: dict[str, Any]) -> dict[str, Any]:
    category = str(body.get("category") or "").strip().lower()
    if category not in ("commercial", "government"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="category must be commercial or government",
        )

    opportunity_type = str(body.get("opportunity_type") or body.get("opportunityType") or "").strip().lower()
    allowed = COMMERCIAL_TYPES if category == "commercial" else GOVERNMENT_TYPES
    if opportunity_type not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"opportunity_type must be one of: {', '.join(sorted(allowed))}",
        )

    title = str(body.get("title") or "").strip()
    if len(title) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="title is required",
        )

    # Curated / Vendors rows are always Very Hot — ignore any other value from the form.
    priority = DEFAULT_PRIORITY

    source = "Internal"
    source_url = None

    openings = body.get("openings")
    openings_int = None
    if openings is not None and str(openings).strip() != "":
        try:
            openings_int = max(1, int(openings))
        except (TypeError, ValueError) as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="openings must be a number",
            ) from exc

    return {
        "category": category,
        "opportunity_type": opportunity_type,
        "company": str(body.get("company") or "").strip(),
        "title": title,
        "location": str(body.get("location") or "").strip(),
        "engagement": (str(body.get("engagement") or "").strip() or None),
        "duration": (str(body.get("duration") or "").strip() or None),
        "openings": openings_int,
        "experience": (str(body.get("experience") or "").strip() or None),
        "skills": _clean_str_list(body.get("skills")),
        "technologies": _clean_str_list(body.get("technologies")),
        "vendor_looking_for": (
            str(body.get("vendor_looking_for") or body.get("vendorLookingFor") or "").strip()
            or None
        ),
        "partnership_model": (
            str(body.get("partnership_model") or body.get("partnershipModel") or "").strip()
            or None
        ),
        "client_industry": (
            str(body.get("client_industry") or body.get("clientIndustry") or "").strip()
            or None
        ),
        "candidate_requirement": (
            str(
                body.get("candidate_requirement") or body.get("candidateRequirement") or ""
            ).strip()
            or None
        ),
        "contact_name": (
            str(body.get("contact_name") or body.get("contactName") or "").strip() or None
        ),
        "contact_email": (
            str(body.get("contact_email") or body.get("contactEmail") or "").strip() or None
        ),
        "source": source,
        "source_url": source_url,
        "priority": priority,
        "description": str(body.get("description") or "").strip(),
        "detected_at": _parse_detected_at(
            body.get("detected_at") or body.get("detectedAt")
        ),
        "payload": body.get("payload") if isinstance(body.get("payload"), dict) else {},
    }


def list_admin(*, include_archived: bool = False) -> list[dict[str, Any]]:
    return curated_opportunity_repository.list_all(include_archived=include_archived)


def get_admin(opportunity_id: str) -> dict[str, Any]:
    found = curated_opportunity_repository.get_by_id(opportunity_id)
    if not found:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")
    return found


def create_admin(*, body: dict[str, Any], created_by: int) -> dict[str, Any]:
    fields = _normalize_fields(body)
    workspace_ids = _validate_workspaces(
        body.get("visible_to_user_ids")
        or body.get("visibleToUserIds")
        or body.get("visible_workspace_ids")
        or []
    )
    return curated_opportunity_repository.create(
        fields=fields,
        visible_workspace_ids=workspace_ids,
        created_by=created_by,
    )


def update_admin(*, opportunity_id: str, body: dict[str, Any]) -> dict[str, Any]:
    fields = _normalize_fields(body)
    raw_vis = body.get("visible_to_user_ids")
    if raw_vis is None:
        raw_vis = body.get("visibleToUserIds")
    workspace_ids = _validate_workspaces(raw_vis) if raw_vis is not None else None
    updated = curated_opportunity_repository.update(
        opportunity_id=opportunity_id,
        fields=fields,
        visible_workspace_ids=workspace_ids,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")
    return updated


def set_visibility_admin(*, opportunity_id: str, workspace_ids: list[int]) -> dict[str, Any]:
    cleaned = _validate_workspaces(workspace_ids)
    updated = curated_opportunity_repository.set_visibility(
        opportunity_id=opportunity_id,
        workspace_ids=cleaned,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")
    return updated


def archive_admin(opportunity_id: str) -> dict[str, Any]:
    updated = curated_opportunity_repository.archive(opportunity_id)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")
    return updated


def map_to_opportunity(row: dict[str, Any]) -> dict[str, Any]:
    """Shape a curated row like radar-mapped opportunities for the customer UI."""
    oid = str(row["id"])
    client_id = f"curated:{oid}"
    op_type = _TYPE_TO_OP.get(str(row.get("opportunityType") or ""), "other")
    temperature = "very_hot"

    skills = row.get("skills") or []
    technologies = row.get("technologies") or []
    tags = list(dict.fromkeys([*(skills or []), *(technologies or [])]))
    signals = [str(row.get("opportunityType") or "").replace("_", " ").title()]
    if row.get("engagement"):
        signals.append(str(row["engagement"]))

    description = str(row.get("description") or "").strip()
    summary = description[:280] + ("…" if len(description) > 280 else "")
    if not summary:
        summary = f"{row.get('title')} at {row.get('company') or 'Unknown company'}"

    rationale_parts = []
    if row.get("partnershipModel"):
        rationale_parts.append(f"Partnership model: {row['partnershipModel']}.")
    if row.get("vendorLookingFor"):
        rationale_parts.append(str(row["vendorLookingFor"]))
    if row.get("clientIndustry"):
        rationale_parts.append(f"Client industry: {row['clientIndustry']}.")
    if not rationale_parts:
        rationale_parts.append(summary)

    contact = None
    if row.get("contactName") or row.get("contactEmail"):
        contact = {
            "name": row.get("contactName"),
            "jobTitle": None,
            "email": row.get("contactEmail"),
            "phone": None,
            "linkedinUrl": None,
        }

    company = str(row.get("company") or "Unknown")
    company_id = f"curated-company:{company.lower().replace(' ', '-')[:80]}"

    return {
        "id": client_id,
        "title": row.get("title") or "Untitled opportunity",
        "companyId": company_id,
        "companyName": company,
        "type": op_type,
        "noticeType": str(row.get("opportunityType") or "").replace("_", " ").title(),
        "temperature": temperature,
        "confidenceScore": 90,
        "summary": summary,
        "rationale": " ".join(rationale_parts),
        "signals": signals + tags[:8],
        "team": None,
        "industry": row.get("clientIndustry")
        or ("Government" if row.get("category") == "government" else "Staffing"),
        "location": row.get("location") or "",
        "country": _country_guess(row.get("location")),
        "companySize": "enterprise",
        "detectedAt": row.get("detectedAt"),
        "deadline": None,
        "sourceId": "job_board" if row.get("category") == "commercial" else "gov_portal",
        "sourceUrl": None,
        "sourceSignal": " · ".join(signals),
        "contact": contact,
        "noticeFacts": None,
        "attachments": [],
        "assignedToId": None,
        "assignedToName": None,
        "assignedAt": None,
        "outreachStatus": "not_contacted",
        "lastContactedAt": None,
        "lastContactedById": None,
        "lastContactedByName": None,
        "lastContactChannel": None,
        "followUpDueAt": None,
        "saved": False,
        "createdAt": row.get("createdAt") or row.get("detectedAt"),
        "updatedAt": row.get("updatedAt") or row.get("detectedAt"),
        "origin": "curated",
        "engagement": row.get("engagement"),
        "duration": row.get("duration"),
        "openings": row.get("openings"),
        "experience": row.get("experience"),
        "skills": skills,
        "technologies": technologies,
        "vendorLookingFor": row.get("vendorLookingFor"),
        "partnershipModel": row.get("partnershipModel"),
        "candidateRequirement": row.get("candidateRequirement"),
        "curatedCategory": row.get("category"),
        "curatedType": row.get("opportunityType"),
    }


def _country_guess(location: Any) -> str:
    text = str(location or "").lower()
    if not text:
        return "OTHER"
    if any(t in text for t in ("india", "bengaluru", "bangalore", "hyderabad", "pune", "chennai", "delhi", "mumbai")):
        return "IN"
    if any(
        t in text
        for t in (
            "united states",
            "usa",
            " u.s",
            "california",
            "texas",
            "new york",
            "san francisco",
            "remote - us",
            " us",
        )
    ) or text.strip() in {"us", "usa", "u.s.", "u.s.a."}:
        return "US"
    return "OTHER"


def release_pending_for_workspace(*, workspace_id: int) -> int:
    """Mark queued curated rows as visible after a successful Radar run."""
    return curated_opportunity_repository.release_pending_for_workspace(
        workspace_id=workspace_id
    )


def list_for_workspace(
    *,
    workspace_id: int,
    category: str | None = None,
) -> list[dict[str, Any]]:
    rows = curated_opportunity_repository.list_visible_for_workspace(
        workspace_id=workspace_id,
        category=category,
    )
    return [map_to_opportunity(r) for r in rows]


def get_for_workspace(*, workspace_id: int, opportunity_id: str) -> dict[str, Any] | None:
    row = curated_opportunity_repository.get_visible_for_workspace(
        workspace_id=workspace_id,
        opportunity_id=opportunity_id,
    )
    return map_to_opportunity(row) if row else None
