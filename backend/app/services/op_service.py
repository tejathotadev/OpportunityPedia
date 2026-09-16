"""Adapters that present radar data in the shapes the OP frontend expects.

`radar_jobs` holds SAM notices keyed by the buying agency, so an agency is the
"company" an opportunity belongs to and `radar_vendors` (past award winners)
ride along as suggested vendors.

Fields OP asks for that the radar has no source for — confidence score, company
size, contacts — are left absent rather than invented.
"""

from __future__ import annotations

import re
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Any
from urllib.parse import quote

from app.api.routes import API_PREFIX
from app.core.request_cache import get_request_cache
from app.providers.sources.sources import SOURCES, enabled_sources
from app.radar.heat import NAICS_CATEGORIES, match_vendors_to_tenders
from app.repositories import radar_repository
from app.services import curated_opportunity_service

# Which collector produced a row must never reach the client, not even as a
# neutral label, so only an opaque bucket is serialised. It exists purely so
# the client can filter hiring leads apart from government notices.
# Employer names (the board tokens) are the actual leads and are not hidden.
_SOURCE_JOB_BOARD = "job_board"
_SOURCE_GOV_PORTAL = "gov_portal"
_SOURCE_UNKNOWN = "radar"

_PUBLIC_SOURCES: dict[str, str] = {
    "greenhouse": _SOURCE_JOB_BOARD,
    "lever": _SOURCE_JOB_BOARD,
    "ashby": _SOURCE_JOB_BOARD,
    "jobs_api": _SOURCE_JOB_BOARD,
    "sam_gov": _SOURCE_GOV_PORTAL,
    "usaspending": _SOURCE_GOV_PORTAL,
    "sec_edgar": _SOURCE_GOV_PORTAL,
}


def _provider_of(row: dict[str, Any]) -> str:
    """Internal collector key. Never serialise this to the client."""
    return str(row.get("provider") or "").strip().lower()


def _source_of(provider: str) -> str:
    return _PUBLIC_SOURCES.get(provider, _SOURCE_UNKNOWN)


COUNTRY_US = "US"
COUNTRY_IN = "IN"
COUNTRY_OTHER = "OTHER"

# Job boards publish location as free text ("Poland", "Remote - US",
# "Bengaluru, India"), so the country has to be read back out of the string.
_INDIA_CITIES = frozenset(
    """ahmedabad bengaluru bangalore chandigarh chennai coimbatore delhi gurgaon
    gurugram hyderabad indore jaipur kochi kolkata mumbai mysore mysuru nagpur
    noida pune surat thiruvananthapuram trivandrum vadodara visakhapatnam""".split()
)
_US_WORDS = frozenset({"usa", "us", "america"})
_US_STATE_CODES = frozenset(
    """al ak az ar ca co ct dc de fl ga hi ia id il in ks ky la ma md me mi mn mo
    ms mt nc nd ne nh nj nm nv ny oh ok or pa pr ri sc sd tn tx ut va vt wa wi wv
    wy""".split()
)


def _country_of(location: Any, provider: str) -> str:
    """Best-effort country for an opportunity, one of US / IN / OTHER."""
    # SAM is US federal procurement, so the place of performance is domestic
    # even when the stored string is a bare city name.
    if provider == "sam_gov":
        return COUNTRY_US

    text = str(location or "").strip().lower()
    if not text:
        return COUNTRY_OTHER
    if "united states" in text or "u.s." in text:
        return COUNTRY_US

    # Whole words only, so "Indianapolis" is never mistaken for "India".
    words = [w for w in re.split(r"[^a-z]+", text) if w]
    if not words:
        return COUNTRY_OTHER
    if "india" in words or _INDIA_CITIES.intersection(words):
        return COUNTRY_IN
    if _US_WORDS.intersection(words):
        return COUNTRY_US
    # A trailing two-letter code is the "City, ST" convention. Anywhere else it
    # is more likely an ordinary word than a state, and "IN" would collide with
    # India, which is why only the last position counts.
    if words[-1] in _US_STATE_CODES:
        return COUNTRY_US
    return COUNTRY_OTHER

# radar signal_type -> OP OpportunityType
_TYPE_BY_SIGNAL = {
    "GOVERNMENT_STAFFING": "rfp",
    "GOVERNMENT_TENDER": "rfp",
    "PROCUREMENT": "procurement",
    "CONTRACT_AWARD": "procurement",
    "JOB_OPENING": "hiring",
    "FUNDING": "funding",
    "EXPANSION": "expansion",
    "ACQUISITION": "partnership",
}

_VISIBLE_TEMPERATURES = ("very_hot", "hot")


def _iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat(timespec="seconds")
    text = str(value).strip()
    return text or None


def _temperature(heat: Any) -> str:
    return "very_hot" if str(heat or "").upper() == "VERY_HOT" else "hot"


def _workplace_flexibility(location: Any, title: Any = None) -> str:
    """Best-effort Remote / Hybrid / On-site from location + title text."""
    text = f"{location or ''} {title or ''}".lower()
    if re.search(r"\bremote\b|\banywhere\b|work from home|\bwfh\b", text):
        return "Remote"
    if "hybrid" in text:
        return "Hybrid"
    if re.search(r"on[\s-]?site|in[\s-]?office", text):
        return "On-site"
    return "Unspecified"


# Airbnb-style team buckets. Order matters: more specific rules first.
_TEAM_TITLE_RULES: list[tuple[str, tuple[str, ...]]] = [
    (
        "Engineering",
        (
            r"\bsoftware engineer\b",
            r"\bbackend\b",
            r"\bfront[\s-]?end\b",
            r"\bfull[\s-]?stack\b",
            r"\bstaff engineer\b",
            r"\bprincipal engineer\b",
            r"\bsite reliability\b",
            r"\bsre\b",
            r"\bdevops\b",
            r"\bplatform engineer\b",
            r"\binfrastructure\b",
            r"\bsecurity engineer\b",
            r"\bml engineer\b",
            r"\bmachine learning engineer\b",
            r"\bdata engineer\b",
            r"\bqa engineer\b",
            r"\bquality assurance\b",
            r"\bdeveloper\b",
            r"\bengineering\b",
            r"\bengineer\b",
        ),
    ),
    (
        "Design",
        (
            r"\bproduct designer\b",
            r"\bux\b",
            r"\bui\b",
            r"\bvisual design\b",
            r"\bbrand design\b",
            r"\bdesigner\b",
        ),
    ),
    (
        "Product",
        (
            r"\bproduct manager\b",
            r"\bproduct owner\b",
            r"\bproduct lead\b",
            r"\bproduct management\b",
            r"\bpm\b",
        ),
    ),
    (
        "Data & Analytics",
        (
            r"\bdata scientist\b",
            r"\bdata analyst\b",
            r"\banalytics\b",
            r"\bbusiness intelligence\b",
            r"\bbi analyst\b",
            r"\bmachine learning\b",
            r"\bstatistician\b",
        ),
    ),
    (
        "Sales & Business Development",
        (
            r"\baccount executive\b",
            r"\baccount manager\b",
            r"\bbusiness development\b",
            r"\bsales\b",
            r"\brevenue\b",
            r"\bpartnerships\b",
        ),
    ),
    (
        "Marketing",
        (
            r"\bmarketing\b",
            r"\bgrowth\b",
            r"\bbrand manager\b",
            r"\bcontent strateg\b",
            r"\bcommunications\b",
            r"\bdemand gen\b",
        ),
    ),
    (
        "Customer Support",
        (
            r"\bcustomer support\b",
            r"\bcustomer success\b",
            r"\bcommunity support\b",
            r"\bsupport engineer\b",
            r"\btechnical support\b",
            r"\bhelpdesk\b",
            r"\bcommunity\b",
        ),
    ),
    (
        "People",
        (
            r"\brecruit\b",
            r"\btalent\b",
            r"\bpeople partner\b",
            r"\bhuman resources\b",
            r"\bhr\b",
            r"\bpeople operations\b",
        ),
    ),
    (
        "Finance",
        (
            r"\bfinance\b",
            r"\baccounting\b",
            r"\bcontroller\b",
            r"\btreasury\b",
            r"\bpayroll\b",
        ),
    ),
    (
        "Legal",
        (
            r"\blegal\b",
            r"\bcounsel\b",
            r"\bcompliance\b",
            r"\bprivacy\b",
        ),
    ),
    (
        "Operations",
        (
            r"\boperations\b",
            r"\bprogram manager\b",
            r"\bproject manager\b",
            r"\bbusiness operations\b",
            r"\bstrategy\b",
        ),
    ),
]

_TEAM_DEPT_KEYWORDS: list[tuple[str, tuple[str, ...]]] = [
    ("Engineering", ("engineering", "software", "developer", "devops", "sre", "platform", "infrastructure", "security", "quality assurance", "qa")),
    ("Design", ("design", "ux", "ui", "creative")),
    ("Product", ("product",)),
    ("Data & Analytics", ("data", "analytics", "business intelligence", "bi")),
    ("Sales & Business Development", ("sales", "business development", "revenue", "partnerships", "account")),
    ("Marketing", ("marketing", "growth", "brand", "communications")),
    ("Customer Support", ("support", "customer success", "community", "service")),
    ("People", ("people", "talent", "recruit", "human resources", "hr")),
    ("Finance", ("finance", "accounting", "controller")),
    ("Legal", ("legal", "counsel", "compliance")),
    ("Operations", ("operations", "program", "project")),
]


def _infer_team_from_title(title: Any) -> str | None:
    text = str(title or "").strip().lower()
    if not text:
        return None
    for team, patterns in _TEAM_TITLE_RULES:
        if any(re.search(pattern, text) for pattern in patterns):
            return team
    return None


def _map_department_to_team(department: Any) -> str | None:
    text = str(department or "").strip()
    if not text:
        return None
    lower = text.lower()
    # Skip SAM-style packed values if they somehow land here.
    if lower.startswith("sam /"):
        return None
    for team, keywords in _TEAM_DEPT_KEYWORDS:
        if any(keyword in lower for keyword in keywords):
            return team
    # Keep short board-provided department names (e.g. "Gitaly", "R&D").
    if len(text) <= 40 and "/" not in text and ";" not in text:
        return text
    return None


def _resolve_hiring_team(*, department: Any, title: Any) -> str:
    """Prefer careers-style buckets so outreach can target Engineering / Product."""
    canonical = {name for name, _ in _TEAM_TITLE_RULES}
    mapped = _map_department_to_team(department)
    inferred = _infer_team_from_title(title)

    if mapped in canonical:
        return mapped  # type: ignore[return-value]
    if inferred:
        return inferred
    if mapped:
        return mapped
    return "Other"


def _work_location_bucket(location: Any) -> str:
    """Collapse messy posting locations into Airbnb-style facet labels."""
    raw = str(location or "").strip()
    if not raw:
        return "Unspecified"

    lower = raw.lower()
    is_remote = bool(
        re.search(r"\bremote\b|\banywhere\b|work from home|\bwfh\b", lower)
    )

    country: str | None = None
    if "united states" in lower or re.search(
        r"(^|[\s,;/])(u\.?s\.?a?\.?|united states of america)([\s,;/]|$)", lower
    ):
        country = "United States"
    elif "canada" in lower:
        country = "Canada"
    elif "united kingdom" in lower or re.search(
        r"(^|[\s,;/])(u\.?k\.?|britain|england|scotland|wales)([\s,;/]|$)", lower
    ):
        country = "United Kingdom"
    elif "india" in lower:
        country = "India"
    elif "ireland" in lower:
        country = "Ireland"
    elif "germany" in lower:
        country = "Germany"
    elif "france" in lower:
        country = "France"
    elif "netherlands" in lower or "amsterdam" in lower:
        country = "Netherlands"
    elif "singapore" in lower:
        country = "Singapore"
    elif "australia" in lower:
        country = "Australia"
    elif "japan" in lower:
        country = "Japan"
    elif re.search(r"\beurope\b|\bemea\b|\beu\b", lower):
        country = "Europe"
    elif "latin america" in lower or "latam" in lower:
        country = "Latin America"

    if is_remote:
        if country == "United States":
            return "Remote - USA"
        if country:
            return f"Remote - {country}"
        return "Remote"

    if country:
        return country

    # Drop multi-office dumps; keep a short readable fallback.
    primary = re.split(r"[;|]", raw)[0].strip()
    if len(primary) > 48:
        primary = primary[:45].rstrip() + "…"
    return primary or "Unspecified"


def _notice_type(department: Any) -> str | None:
    """`department` is stored as "SAM / <notice type> / NAICS <code>"."""
    parts = [p.strip() for p in str(department or "").split("/") if p.strip()]
    return parts[1] if len(parts) > 1 else None


def _parse_dt(value: Any) -> datetime | None:
    text = _iso(value)
    if not text:
        return None
    cleaned = text.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(cleaned)
    except ValueError:
        try:
            parsed = datetime.combine(date.fromisoformat(cleaned[:10]), datetime.min.time())
        except ValueError:
            return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def _days_until(value: Any) -> int | None:
    parsed = _parse_dt(value)
    if not parsed:
        return None
    return (parsed.date() - datetime.now(timezone.utc).date()).days


def _within_days(value: Any, days: int) -> bool:
    parsed = _parse_dt(value)
    if not parsed:
        return False
    return parsed >= datetime.now(timezone.utc) - timedelta(days=days)


def _as_detail(row: dict[str, Any]) -> dict[str, Any]:
    detail = row.get("detail")
    if isinstance(detail, dict):
        return detail
    return {}


def _template_summary(
    *,
    notice_type: str,
    agency: str,
    naics: Any,
    set_aside: str | None,
    deadline_iso: str | None,
) -> str:
    """Short Plan A summary from search metadata — no LLM, no extra SAM call."""
    bits = [f"{notice_type} from {agency}"]
    if naics:
        bits.append(f"NAICS {naics}")
    if set_aside:
        bits.append(f"set-aside: {set_aside}")
    days = _days_until(deadline_iso) if deadline_iso else None
    if days is not None and days >= 0:
        bits.append(f"response due in {days} day{'s' if days != 1 else ''}")
    elif deadline_iso:
        bits.append("response deadline passed")
    return ". ".join(bits) + "."


def _client_attachments(detail: dict[str, Any], *, view_url: str | None) -> list[dict[str, Any]]:
    """Attachment names for Sources tab. Direct SAM resource URLs stay off the client."""
    raw = detail.get("attachments")
    if not isinstance(raw, list):
        return []
    out: list[dict[str, Any]] = []
    for index, item in enumerate(raw, start=1):
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or f"Attachment {index}").strip()
        out.append(
            {
                "id": str(item.get("id") or f"att-{index}"),
                "name": name,
                "viewUrl": view_url,
            }
        )
    return out


def map_opportunity(row: dict[str, Any]) -> dict[str, Any]:
    naics = row.get("naics")
    category = row.get("category")
    agency = row.get("board_name") or row.get("agency_name") or "Unknown agency"
    signal_type = str(row.get("signal_type") or "").upper()
    provider = _provider_of(row)
    source_id = _source_of(provider)
    detail = _as_detail(row)

    # A job board stores the hiring team in `department`; SAM packs the notice
    # type into that same column, so the two read differently. When department
    # is missing, infer a careers-style Team from the job title.
    is_job = signal_type == "JOB_OPENING"
    team = (
        _resolve_hiring_team(department=row.get("department"), title=row.get("title"))
        if is_job
        else ""
    )
    notice_type = (
        (detail.get("noticeType") if not is_job else None)
        or ("Job opening" if is_job else _notice_type(row.get("department")))
        or "Notice"
    )

    signals = [notice_type]
    if team:
        signals.append(team)
    if naics:
        signals.append(f"NAICS {naics}")
    if category:
        signals.append(category)
    set_aside = str(detail.get("setAside") or "").strip() or None
    if set_aside:
        signals.append(set_aside)

    detail_text = f"NAICS {naics}" if naics else "no NAICS code"
    # Prefer stable SAM notice id so drawer deep-links survive in-memory restarts.
    opportunity_id = str(row.get("external_job_id") or row.get("id") or "")
    deadline = None if is_job else _iso(row.get("updated_at"))

    if is_job:
        summary = f"Open role at {agency}" + (f" in {team}." if team else ".")
        rationale = f"{agency} is hiring" + (f" in {team}." if team else ".")
        contact = None
        notice_facts: dict[str, Any] | None = None
        attachments: list[dict[str, Any]] = []
        team_name = team or None
    else:
        summary = _template_summary(
            notice_type=notice_type,
            agency=agency,
            naics=naics,
            set_aside=set_aside,
            deadline_iso=deadline,
        )
        rationale = (
            f"{agency} has an open {notice_type.lower()} classified {detail_text}"
            + (f" ({category})" if category else "")
            + ". Currently an active notice."
        )
        contact_raw = detail.get("contact") if isinstance(detail.get("contact"), dict) else None
        contact = None
        if contact_raw and (contact_raw.get("name") or contact_raw.get("email") or contact_raw.get("phone")):
            contact = {
                "name": contact_raw.get("name"),
                "jobTitle": contact_raw.get("jobTitle"),
                "email": contact_raw.get("email"),
                "phone": contact_raw.get("phone"),
                "linkedinUrl": None,
            }
        source_view = (
            f"{API_PREFIX}/opportunities/{quote(opportunity_id)}/open"
            if row.get("url") and opportunity_id
            else None
        )
        notice_facts = {
            "noticeId": opportunity_id or None,
            "solicitationNumber": detail.get("solicitationNumber") or row.get("requisition_id"),
            "noticeType": notice_type,
            "department": detail.get("department") or agency,
            "subTier": detail.get("subTier"),
            "office": detail.get("office"),
            "setAside": set_aside,
            "psc": detail.get("psc"),
            "naics": naics,
            "category": category,
            "officeAddress": detail.get("officeAddress"),
            "archiveDate": detail.get("archiveDate"),
            "agencyPath": detail.get("agencyPath"),
        }
        attachments = _client_attachments(detail, view_url=source_view)
        team_name = None

    return {
        "id": opportunity_id,
        "title": row.get("title") or "Untitled notice",
        "companyId": row.get("board_token") or "unknown-agency",
        "companyName": agency,
        "type": _TYPE_BY_SIGNAL.get(signal_type, "other"),
        # SAM Contract Opportunity Type for the UI Type column. Coarse `type`
        # stays `rfp` / `procurement` for lane filters; this is display-only.
        "noticeType": None if is_job else notice_type,
        "temperature": _temperature(row.get("heat")),
        "summary": summary,
        "rationale": rationale,
        "signals": signals,
        "team": team_name,
        "workplaceFlexibility": (
            _workplace_flexibility(row.get("location"), row.get("title")) if is_job else None
        ),
        "workLocation": _work_location_bucket(row.get("location")) if is_job else None,
        "industry": category or ("Hiring" if is_job else "Employment Services"),
        "location": row.get("location") or "United States",
        "country": _country_of(row.get("location"), provider),
        "detectedAt": _iso(row.get("posted_at")) or _iso(row.get("created_at")),
        # `updated_at` holds SAM's effective deadline. A job posting has no
        # response date, so leaving it would fill Upcoming Deadlines with edit
        # timestamps that nothing is actually due on.
        "deadline": deadline,
        "sourceId": source_id,
        # The real posting URL names the board in its domain, so it is served
        # through a redirect the client cannot read the destination of.
        "sourceUrl": (
            f"{API_PREFIX}/opportunities/{quote(opportunity_id)}/open"
            if row.get("url") and opportunity_id
            else None
        ),
        "sourceSignal": " · ".join(signals),
        "naics": naics,
        "solicitationNumber": row.get("requisition_id") or detail.get("solicitationNumber"),
        "noticeFacts": notice_facts,
        "attachments": attachments,
        "contact": contact,
        # No CRM tables yet — every notice is unowned and uncontacted.
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
        "createdAt": _iso(row.get("created_at")) or _iso(row.get("posted_at")),
        "updatedAt": _iso(row.get("created_at")) or _iso(row.get("posted_at")),
    }


def _map_suggested_vendor(vendor: dict[str, Any]) -> dict[str, Any]:
    return {
        "vendorName": vendor.get("vendor_name"),
        "vendorUei": vendor.get("vendor_uei"),
        "cageCode": vendor.get("cage_code"),
        "registrationStatus": vendor.get("registration_status"),
        "agencyName": vendor.get("agency_name"),
        "awardTitle": vendor.get("award_title"),
        "awardUrl": vendor.get("award_url"),
        "naics": vendor.get("naics"),
        "category": vendor.get("category"),
        "matchScore": vendor.get("match_score"),
    }


def _hydrate_jobs_from_details(user_id: int) -> list[dict[str, Any]]:
    """SAM tenders persisted at scan time (survive restart and memory caps)."""
    try:
        from app.repositories import opportunity_detail_repository

        return opportunity_detail_repository.list_for_user(user_id)
    except Exception:
        return []


def _merge_sam_details(user_id: int, jobs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Always overlay Postgres SAM rows so Tenders are not lost to the hiring cap."""
    persisted = [
        row
        for row in _hydrate_jobs_from_details(user_id)
        if str(row.get("provider") or "sam_gov") == "sam_gov"
    ]
    if not persisted:
        return jobs
    by_notice: dict[str, dict[str, Any]] = {}
    order: list[str] = []
    unlabeled: list[dict[str, Any]] = []
    for row in jobs:
        notice_id = str(row.get("external_job_id") or "")
        if not notice_id:
            unlabeled.append(row)
            continue
        by_notice[notice_id] = row
        order.append(notice_id)
    for row in persisted:
        notice_id = str(row.get("external_job_id") or "")
        if not notice_id:
            continue
        existing = by_notice.get(notice_id)
        if existing is None:
            by_notice[notice_id] = row
            order.append(notice_id)
            continue
        if not existing.get("detail") and row.get("detail"):
            existing["detail"] = row["detail"]
    seen: set[str] = set()
    merged: list[dict[str, Any]] = list(unlabeled)
    for notice_id in order:
        if notice_id in seen:
            continue
        seen.add(notice_id)
        merged.append(by_notice[notice_id])
    for notice_id, row in by_notice.items():
        if notice_id not in seen:
            merged.append(row)
    return merged


def _load(user_id: int) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Rows from disabled sources stay in the table until the next run clears
    it, so read them out here — OP should only ever show live sources."""
    cache = get_request_cache()
    cache_key = f"op_load:{user_id}"
    hit = cache.get(cache_key)
    if hit is not None:
        return hit

    live = {str(s.get("collector")) for s in enabled_sources()}
    jobs = [
        row
        for row in radar_repository.list_jobs_for_user(user_id, limit=5000)
        if str(row.get("provider")) in live
    ]
    jobs = [
        row
        for row in _merge_sam_details(user_id, jobs)
        if str(row.get("provider")) in live
    ]
    vendors = [
        row
        for row in radar_repository.list_vendors_for_user(user_id, limit=5000)
        if str(row.get("provider")) in live
    ]
    result = (jobs, vendors)
    cache[cache_key] = result
    return result


def _opportunities(user_id: int) -> list[dict[str, Any]]:
    cache = get_request_cache()
    cache_key = f"op_opportunities:{user_id}"
    hit = cache.get(cache_key)
    if hit is not None:
        return hit

    jobs, _ = _load(user_id)
    mapped = [map_opportunity(row) for row in jobs]
    visible = [o for o in mapped if o["temperature"] in _VISIBLE_TEMPERATURES]
    result = _apply_assignment_state(user_id, _apply_outreach_state(user_id, visible))
    cache[cache_key] = result
    return result


def _apply_outreach_state(
    user_id: int, items: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Overlay persisted outreach onto mapped opportunities."""
    try:
        from app.repositories import outreach_repository

        latest = outreach_repository.latest_sent_by_opportunity(user_id=user_id)
    except Exception:
        return items
    if not latest:
        return items
    out: list[dict[str, Any]] = []
    for item in items:
        row = dict(item)
        sent = latest.get(str(row.get("id") or ""))
        if not sent and row.get("companyId"):
            token = str(row["companyId"])
            sent = latest.get(f"company:{token}") or latest.get(token)
        if sent:
            row["outreachStatus"] = "contacted"
            row["lastContactedAt"] = sent.get("sentAt")
            row["lastContactedById"] = sent.get("senderId")
            row["lastContactedByName"] = sent.get("senderName")
            row["lastContactChannel"] = sent.get("channel") or "email"
        out.append(row)
    return out


def _apply_assignment_state(
    user_id: int, items: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Overlay persisted Assign-to-me ownership onto notices and companies."""
    try:
        from app.repositories import assignment_repository

        owned = assignment_repository.map_for_user(user_id)
    except Exception:
        return items
    if not owned:
        return items
    out: list[dict[str, Any]] = []
    for item in items:
        row = dict(item)
        assignment = owned.get(str(row.get("id") or ""))
        if not assignment and row.get("companyId"):
            token = str(row["companyId"])
            assignment = owned.get(f"company:{token}") or owned.get(token)
        if assignment:
            row["assignedToId"] = assignment["assignedToId"]
            row["assignedToName"] = assignment["assignedToName"]
            row["assignedAt"] = assignment["assignedAt"]
        out.append(row)
    return out


def _decorate_company_rows(
    user_id: int, rows: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Attach owner + outreach using the same ids as company assign/outreach."""
    prepared: list[dict[str, Any]] = []
    for row in rows:
        prepared.append(
            {
                **row,
                "id": f"company:{row['companyId']}",
                "outreachStatus": row.get("outreachStatus") or "not_contacted",
                "assignedToId": row.get("assignedToId"),
                "assignedToName": row.get("assignedToName"),
                "assignedAt": row.get("assignedAt"),
                "lastContactedAt": row.get("lastContactedAt"),
                "lastContactedById": row.get("lastContactedById"),
                "lastContactedByName": row.get("lastContactedByName"),
                "lastContactChannel": row.get("lastContactChannel"),
            }
        )
    return _decorate_ownership(user_id, prepared)


def _decorate_ownership(user_id: int, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return _apply_assignment_state(user_id, _apply_outreach_state(user_id, items))


# ---------------------------------------------------------------- filtering


def _list_of(params: Any, name: str) -> list[str]:
    """Accept both `key=a&key=b` and axios' `key[]=a&key[]=b`."""
    values: list[str] = []
    for key in (name, f"{name}[]"):
        values.extend(params.getlist(key))
    out: list[str] = []
    for value in values:
        for part in str(value).split(","):
            item = part.strip()
            if item and item not in out:
                out.append(item)
    return out


def _one_of(params: Any, name: str) -> str | None:
    value = params.get(name)
    if value is None:
        value = params.get(f"{name}[]")
    text = str(value).strip() if value is not None else ""
    return text or None


def _int_of(params: Any, name: str, default: int | None = None) -> int | None:
    raw = _one_of(params, name)
    if raw is None:
        return default
    try:
        return int(float(raw))
    except (TypeError, ValueError):
        return default


_SORTABLE = {
    "title",
    "companyName",
    "type",
    "temperature",
    "location",
    "detectedAt",
    "deadline",
    "assignedToName",
    "outreachStatus",
    "lastContactedAt",
}

_TEMPERATURE_ORDER = {"very_hot": 0, "hot": 1}


def _matches_search(item: dict[str, Any], term: str) -> bool:
    needle = term.strip().lower()
    if not needle:
        return True
    haystack = " ".join(
        str(item.get(key) or "")
        for key in ("title", "companyName", "industry", "location", "summary")
    )
    return needle in haystack.lower()


def _matches_title(item: dict[str, Any], term: str) -> bool:
    """Title-only match for role keywords (e.g. engineer, IT)."""
    needle = term.strip().lower()
    if not needle:
        return True
    return needle in str(item.get("title") or "").lower()


def filter_opportunities(items: list[dict[str, Any]], params: Any) -> list[dict[str, Any]]:
    search = _one_of(params, "q")
    title_match = _one_of(params, "title_match")
    temperatures = _list_of(params, "temperature")
    types = _list_of(params, "type")
    industries = _list_of(params, "industry")
    locations = _list_of(params, "location")
    countries = _list_of(params, "country")
    sources = _list_of(params, "source")
    company_id = _one_of(params, "company_id")
    detected_within = _int_of(params, "detected_within_days")
    deadline_within = _int_of(params, "deadline_within_days")

    out: list[dict[str, Any]] = []
    for item in items:
        if search and not _matches_search(item, search):
            continue
        if title_match and not _matches_title(item, title_match):
            continue
        if temperatures and item["temperature"] not in temperatures:
            continue
        if types and item["type"] not in types:
            continue
        if industries and item["industry"] not in industries:
            continue
        if locations and item["location"] not in locations:
            continue
        if countries and item["country"] not in countries:
            continue
        if sources and item["sourceId"] not in sources:
            continue
        if company_id and item["companyId"] != company_id:
            continue
        if detected_within and not _within_days(item.get("detectedAt"), detected_within):
            continue
        if deadline_within:
            days = _days_until(item.get("deadline"))
            if days is None or days < 0 or days > deadline_within:
                continue
        out.append(item)
    return out


def _sort_key(item: dict[str, Any], key: str) -> Any:
    if key == "temperature":
        return _TEMPERATURE_ORDER.get(item["temperature"], 9)
    if key in {"detectedAt", "deadline", "lastContactedAt"}:
        parsed = _parse_dt(item.get(key))
        return parsed.timestamp() if parsed else float("-inf")
    return str(item.get(key) or "").lower()


def _by_priority(item: dict[str, Any]) -> tuple[int, float]:
    parsed = _parse_dt(item.get("detectedAt"))
    return (
        _TEMPERATURE_ORDER.get(item["temperature"], 9),
        -(parsed.timestamp() if parsed else 0.0),
    )


def sort_opportunities(items: list[dict[str, Any]], params: Any) -> list[dict[str, Any]]:
    key = _one_of(params, "sort_by")
    if not key or key not in _SORTABLE:
        return sorted(items, key=_by_priority)
    reverse = (_one_of(params, "sort_dir") or "asc").lower() == "desc"
    return sorted(items, key=lambda item: _sort_key(item, key), reverse=reverse)


def _paginate(items: list[dict[str, Any]], params: Any) -> dict[str, Any]:
    page = max(1, _int_of(params, "page", 1) or 1)
    page_size = min(max(1, _int_of(params, "page_size", 25) or 25), 500)
    start = (page - 1) * page_size
    return {
        "items": items[start : start + page_size],
        "total": len(items),
        "page": page,
        "pageSize": page_size,
    }


# ------------------------------------------------------------- opportunities


def _overlay_sam_detail_fields(
    user_id: int, jobs: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Fill missing `detail` JSON from opportunity_details without adding rows."""
    if not jobs:
        return jobs
    try:
        from app.repositories import opportunity_detail_repository

        persisted = {
            str(row.get("external_job_id") or ""): row
            for row in opportunity_detail_repository.list_for_user(user_id)
            if row.get("external_job_id")
        }
    except Exception:
        return jobs
    if not persisted:
        return jobs
    out: list[dict[str, Any]] = []
    for row in jobs:
        notice_id = str(row.get("external_job_id") or "")
        extra = persisted.get(notice_id)
        if extra and not row.get("detail") and extra.get("detail"):
            merged = dict(row)
            merged["detail"] = extra["detail"]
            out.append(merged)
        else:
            out.append(row)
    return out


def _signals_for_types(types: list[str] | None) -> list[str] | None:
    if not types:
        return None
    by_type: dict[str, list[str]] = {}
    for signal, opp_type in _TYPE_BY_SIGNAL.items():
        by_type.setdefault(opp_type, []).append(signal)
    out: list[str] = []
    for t in types:
        out.extend(by_type.get(t, []))
    return out or None


def _providers_for_sources(
    sources: list[str] | None, live: set[str]
) -> list[str] | None:
    if not sources:
        return sorted(live)
    buckets = {
        _SOURCE_JOB_BOARD: {"greenhouse", "lever", "ashby", "jobs_api"},
        _SOURCE_GOV_PORTAL: {"sam_gov", "usaspending", "sec_edgar"},
    }
    wanted: set[str] = set()
    for source in sources:
        wanted |= buckets.get(source, set())
    return sorted(wanted & live) if wanted else sorted(live)


def list_opportunities(*, user_id: int, params: Any) -> dict[str, Any]:
    """Paginated opportunity list — radar jobs plus admin-curated government signals."""
    origin = (_one_of(params, "origin") or "").strip().lower()
    if origin == "curated":
        return list_shared_opportunities(user_id=user_id, params=params)

    curated_gov = curated_opportunity_service.list_for_workspace(
        workspace_id=user_id,
        category="government",
    )
    # When curated gov rows exist, use the in-memory path so pagination/totals stay correct.
    if curated_gov:
        items = filter_opportunities(_opportunities(user_id) + curated_gov, params)
        items = _apply_assignment_state(user_id, _apply_outreach_state(user_id, items))
        return _paginate(sort_opportunities(items, params), params)

    page = max(1, _int_of(params, "page", 1) or 1)
    page_size = min(max(1, _int_of(params, "page_size", 25) or 25), 500)
    offset = (page - 1) * page_size

    live = {str(s.get("collector")) for s in enabled_sources()}
    temperatures = _list_of(params, "temperature") or list(_VISIBLE_TEMPERATURES)
    heats: list[str] = []
    if "very_hot" in temperatures:
        heats.append("VERY_HOT")
    if "hot" in temperatures:
        heats.append("HOT")

    industries = _list_of(params, "industry")
    # "Hiring" / "Employment Services" are mapped defaults, not always stored in category.
    sql_categories = None
    if industries:
        sql_categories = industries

    try:
        rows, total = radar_repository.query_jobs_page(
            user_id=user_id,
            providers=_providers_for_sources(_list_of(params, "source"), live),
            heats=heats or ["VERY_HOT", "HOT"],
            signal_types=_signals_for_types(_list_of(params, "type")),
            board_token=_one_of(params, "company_id"),
            search=_one_of(params, "q"),
            title_match=_one_of(params, "title_match"),
            locations=_list_of(params, "location"),
            categories=sql_categories,
            countries=_list_of(params, "country"),
            detected_within_days=_int_of(params, "detected_within_days"),
            deadline_within_days=_int_of(params, "deadline_within_days"),
            sort_by=_one_of(params, "sort_by"),
            sort_dir=_one_of(params, "sort_dir") or "asc",
            limit=page_size,
            offset=offset,
        )
    except Exception:
        items = filter_opportunities(_opportunities(user_id), params)
        return _paginate(sort_opportunities(items, params), params)

    rows = _overlay_sam_detail_fields(user_id, rows)
    items = [
        o
        for o in (map_opportunity(row) for row in rows)
        if o["temperature"] in _VISIBLE_TEMPERATURES
    ]
    items = _apply_assignment_state(user_id, _apply_outreach_state(user_id, items))
    return {
        "items": items,
        "total": total,
        "page": page,
        "pageSize": page_size,
    }


def list_shared_opportunities(*, user_id: int, params: Any) -> dict[str, Any]:
    """Admin-curated opportunities visible to this workspace (commercial or all)."""
    category = (_one_of(params, "category") or "").strip().lower() or None
    if category not in (None, "commercial", "government"):
        category = None
    items = curated_opportunity_service.list_for_workspace(
        workspace_id=user_id,
        category=category,
    )
    items = filter_opportunities(items, params)
    items = _apply_assignment_state(user_id, _apply_outreach_state(user_id, items))
    return _paginate(sort_opportunities(items, params), params)


def _rollup_companies(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """One row per employer with matching opportunity counts. No source names."""
    by_token: dict[str, dict[str, Any]] = {}
    team_counters: dict[str, Counter[str]] = defaultdict(Counter)
    for item in items:
        token = item["companyId"]
        row = by_token.get(token)
        if not row:
            row = {
                "companyId": token,
                "companyName": item["companyName"],
                "industry": item.get("industry") or "",
                "location": item.get("location") or "",
                "country": item.get("country") or "",
                "matchingCount": 0,
                "veryHot": 0,
                "hot": 0,
                "highestTemperature": item["temperature"],
                "lastDetectedAt": item.get("detectedAt"),
                "types": set(),
            }
            by_token[token] = row
        row["matchingCount"] += 1
        if item["temperature"] == "very_hot":
            row["veryHot"] += 1
        else:
            row["hot"] += 1
        if _TEMPERATURE_ORDER.get(item["temperature"], 9) < _TEMPERATURE_ORDER.get(
            row["highestTemperature"], 9
        ):
            row["highestTemperature"] = item["temperature"]
        detected = item.get("detectedAt")
        if detected and (
            row["lastDetectedAt"] is None or str(detected) > str(row["lastDetectedAt"])
        ):
            row["lastDetectedAt"] = detected
        row["types"].add(item.get("type") or "")
        team = str(item.get("team") or "").strip()
        if team:
            team_counters[token][team] += 1

    rows: list[dict[str, Any]] = []
    for token, row in by_token.items():
        types = sorted(t for t in row.pop("types") if t)
        top_teams = [
            {"name": name, "count": count}
            for name, count in team_counters[token].most_common(5)
        ]
        rows.append({**row, "types": types, "teamBreakdown": top_teams})
    return sorted(
        rows,
        key=lambda r: (
            _TEMPERATURE_ORDER.get(r["highestTemperature"], 9),
            -r["matchingCount"],
            r["companyName"].lower(),
        ),
    )


def company_as_opportunity(
    *,
    user_id: int,
    company_id: str,
    teams: list[str] | None = None,
    locations: list[str] | None = None,
    flexibilities: list[str] | None = None,
) -> dict[str, Any] | None:
    """Commercial outreach target: one synthetic opportunity per employer."""
    signal = company_hiring_signal(
        user_id=user_id,
        company_id=company_id,
        teams=teams,
        locations=locations,
        flexibilities=flexibilities,
    )
    return signal.get("opportunity") if signal else None


def _hiring_jobs_for_company(user_id: int, token: str) -> list[dict[str, Any]]:
    return [
        i
        for i in _opportunities(user_id)
        if i.get("type") == "hiring" and i.get("companyId") == token
    ]


def _apply_hiring_facets(
    items: list[dict[str, Any]],
    *,
    teams: list[str] | None,
    locations: list[str] | None,
    flexibilities: list[str] | None,
) -> list[dict[str, Any]]:
    out = items
    if teams:
        wanted = {str(t) for t in teams}
        out = [i for i in out if str(i.get("team") or "") in wanted]
    if locations:
        wanted = {str(t) for t in locations}
        out = [
            i
            for i in out
            if str(i.get("workLocation") or i.get("location") or "").strip() in wanted
        ]
    if flexibilities:
        wanted = {str(t) for t in flexibilities}
        out = [
            i
            for i in out
            if str(i.get("workplaceFlexibility") or "Unspecified") in wanted
        ]
    return out


def _facet_buckets(items: list[dict[str, Any]], key: str) -> list[dict[str, Any]]:
    counts: Counter[str] = Counter()
    for item in items:
        raw = item.get(key)
        if key == "workplaceFlexibility":
            name = str(raw or "Unspecified").strip() or "Unspecified"
        elif key == "workLocation":
            name = str(raw or item.get("location") or "Unspecified").strip() or "Unspecified"
        else:
            name = str(raw or "").strip()
            if not name:
                continue
        counts[name] += 1
    return [{"name": name, "count": count} for name, count in counts.most_common(80)]


def _build_company_opportunity(
    *,
    token: str,
    name: str,
    total_count: int,
    matched: list[dict[str, Any]],
    teams_selected: list[str],
    locations_selected: list[str],
    flex_selected: list[str],
) -> dict[str, Any]:
    rollup = _rollup_companies(matched) if matched else []
    row = (
        rollup[0]
        if rollup
        else {
            "highestTemperature": "hot",
            "industry": "Hiring",
            "location": "—",
            "country": COUNTRY_OTHER,
            "lastDetectedAt": None,
            "teamBreakdown": [],
        }
    )
    matched_count = len(matched)
    team_bits = ", ".join(
        f"{t['name']} ({t['count']})" for t in (row.get("teamBreakdown") or [])[:3]
    )
    filter_bits: list[str] = []
    if teams_selected:
        filter_bits.append("Team: " + ", ".join(teams_selected))
    if locations_selected:
        filter_bits.append("Location: " + ", ".join(locations_selected))
    if flex_selected:
        filter_bits.append("Flexibility: " + ", ".join(flex_selected))
    filter_label = " · ".join(filter_bits)

    if filter_label:
        summary = (
            f"{name} has {total_count} open role{'s' if total_count != 1 else ''}; "
            f"{matched_count} match {filter_label}."
        )
    else:
        summary = f"{name} has {matched_count} open role{'s' if matched_count != 1 else ''}"
        if team_bits:
            summary += f". Top teams: {team_bits}."
        else:
            summary += "."

    return {
        "id": f"company:{token}",
        "kind": "company",
        "title": f"Hiring activity at {name}",
        "companyId": token,
        "companyName": name,
        "type": "hiring",
        "noticeType": None,
        "temperature": row.get("highestTemperature") or "hot",
        "confidenceScore": 0,
        "summary": summary,
        "rationale": summary,
        "signals": [f"{matched_count} matched openings"]
        + ([filter_label] if filter_label else [])
        + [t["name"] for t in (row.get("teamBreakdown") or [])[:3]],
        "teamBreakdown": row.get("teamBreakdown") or [],
        "signalCount": matched_count,
        "totalOpeningCount": total_count,
        "hiringFilters": {
            "teams": teams_selected,
            "locations": locations_selected,
            "flexibilities": flex_selected,
        },
        "industry": row.get("industry") or "Hiring",
        "location": row.get("location") or "—",
        "country": row.get("country") or COUNTRY_OTHER,
        "companySize": "mid_market",
        "detectedAt": row.get("lastDetectedAt"),
        "deadline": None,
        "sourceId": _SOURCE_JOB_BOARD,
        "sourceUrl": None,
        "sourceSignal": summary,
        "contact": None,
        "outreachStatus": "not_contacted",
        "lastContactedAt": None,
        "lastContactedById": None,
        "lastContactedByName": None,
        "lastContactChannel": None,
        "assignedToId": None,
        "assignedToName": None,
        "assignedAt": None,
        "followUpDueAt": None,
        "saved": False,
        "createdAt": row.get("lastDetectedAt"),
        "updatedAt": row.get("lastDetectedAt"),
        "suggestedVendors": [],
    }


def company_hiring_signal(
    *,
    user_id: int,
    company_id: str,
    teams: list[str] | None = None,
    locations: list[str] | None = None,
    flexibilities: list[str] | None = None,
) -> dict[str, Any] | None:
    """Facets + filtered count for commercial outreach (no openings list)."""
    token = str(company_id or "").strip()
    if token.startswith("company:"):
        token = token.split(":", 1)[1]
    if not token:
        return None

    teams_sel = [str(t) for t in (teams or []) if str(t).strip()]
    locs_sel = [str(t) for t in (locations or []) if str(t).strip()]
    flex_sel = [str(t) for t in (flexibilities or []) if str(t).strip()]

    all_jobs = _hiring_jobs_for_company(user_id, token)
    if all_jobs:
        return _hiring_signal_from_jobs(
            user_id=user_id,
            token=token,
            all_jobs=all_jobs,
            teams_sel=teams_sel,
            locs_sel=locs_sel,
            flex_sel=flex_sel,
        )

    return _hiring_signal_from_persisted(
        user_id=user_id,
        token=token,
        teams_sel=teams_sel,
        locs_sel=locs_sel,
        flex_sel=flex_sel,
    )


def _hiring_signal_from_jobs(
    *,
    user_id: int,
    token: str,
    all_jobs: list[dict[str, Any]],
    teams_sel: list[str],
    locs_sel: list[str],
    flex_sel: list[str],
) -> dict[str, Any]:
    matched = _apply_hiring_facets(
        all_jobs,
        teams=teams_sel or None,
        locations=locs_sel or None,
        flexibilities=flex_sel or None,
    )
    team_pool = _apply_hiring_facets(
        all_jobs, teams=None, locations=locs_sel or None, flexibilities=flex_sel or None
    )
    location_pool = _apply_hiring_facets(
        all_jobs, teams=teams_sel or None, locations=None, flexibilities=flex_sel or None
    )
    flex_pool = _apply_hiring_facets(
        all_jobs, teams=teams_sel or None, locations=locs_sel or None, flexibilities=None
    )

    name = all_jobs[0].get("companyName") or token
    total_count = len(all_jobs)
    opportunity = _build_company_opportunity(
        token=token,
        name=name,
        total_count=total_count,
        matched=matched,
        teams_selected=teams_sel,
        locations_selected=locs_sel,
        flex_selected=flex_sel,
    )
    opportunity = _decorate_ownership(user_id, [opportunity])[0]

    return {
        "companyId": token,
        "companyName": name,
        "totalCount": total_count,
        "matchedCount": len(matched),
        "filters": {
            "teams": teams_sel,
            "locations": locs_sel,
            "flexibilities": flex_sel,
        },
        "facets": {
            "teams": _facet_buckets(team_pool, "team"),
            "locations": _facet_buckets(location_pool, "workLocation"),
            "flexibilities": _facet_buckets(flex_pool, "workplaceFlexibility"),
        },
        "opportunity": opportunity,
    }


def _atom_items_for_company(signal: dict[str, Any]) -> list[dict[str, Any]]:
    """Turn stored facet atoms into filterable pseudo-opportunities (no job data)."""
    token = signal["company_id"]
    name = signal["company_name"]
    items: list[dict[str, Any]] = []
    for atom in signal.get("atoms") or []:
        if not isinstance(atom, dict):
            continue
        items.append(
            {
                "companyId": token,
                "companyName": name,
                "type": "hiring",
                "team": atom.get("team"),
                "workLocation": atom.get("workLocation"),
                "workplaceFlexibility": atom.get("workplaceFlexibility") or "Unspecified",
                "temperature": atom.get("temperature")
                or signal.get("highest_temperature")
                or "hot",
                "industry": signal.get("industry") or "Hiring",
                "location": signal.get("location") or "—",
                "country": signal.get("country") or COUNTRY_OTHER,
                "detectedAt": signal.get("last_detected_at"),
            }
        )
    return items


def _hiring_signal_from_persisted(
    *,
    user_id: int,
    token: str,
    teams_sel: list[str],
    locs_sel: list[str],
    flex_sel: list[str],
) -> dict[str, Any] | None:
    try:
        from app.repositories import company_hiring_repository

        signal = company_hiring_repository.get_for_user(user_id, token)
    except Exception:
        return None
    if not signal:
        return None

    all_items = _atom_items_for_company(signal)
    if not all_items:
        # Fall back to unfiltered totals when atoms are missing.
        total = int(signal.get("total_openings") or 0)
        facets = signal.get("facets") or {}
        opportunity = _build_company_opportunity(
            token=token,
            name=signal["company_name"],
            total_count=total,
            matched=[],
            teams_selected=teams_sel,
            locations_selected=locs_sel,
            flex_selected=flex_sel,
        )
        opportunity["signalCount"] = total if not (teams_sel or locs_sel or flex_sel) else 0
        opportunity["teamBreakdown"] = signal.get("team_breakdown") or []
        opportunity = _decorate_ownership(user_id, [opportunity])[0]
        return {
            "companyId": token,
            "companyName": signal["company_name"],
            "totalCount": total,
            "matchedCount": opportunity["signalCount"],
            "filters": {
                "teams": teams_sel,
                "locations": locs_sel,
                "flexibilities": flex_sel,
            },
            "facets": {
                "teams": facets.get("teams") or [],
                "locations": facets.get("locations") or [],
                "flexibilities": facets.get("flexibilities") or [],
            },
            "opportunity": opportunity,
        }

    return _hiring_signal_from_jobs(
        user_id=user_id,
        token=token,
        all_jobs=all_items,
        teams_sel=teams_sel,
        locs_sel=locs_sel,
        flex_sel=flex_sel,
    )


def build_company_hiring_snapshots(user_id: int) -> list[dict[str, Any]]:
    """Roll hiring openings into DB-ready company rows (no job titles/URLs)."""
    hiring = [i for i in _opportunities(user_id) if i.get("type") == "hiring"]
    if not hiring:
        return []

    by_token: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in hiring:
        by_token[str(item.get("companyId") or "")].append(item)

    snapshots: list[dict[str, Any]] = []
    for token, items in by_token.items():
        if not token:
            continue
        rollup = _rollup_companies(items)
        row = rollup[0] if rollup else {}
        atoms = [
            {
                "team": item.get("team") or "Other",
                "workLocation": item.get("workLocation")
                or _work_location_bucket(item.get("location")),
                "workplaceFlexibility": item.get("workplaceFlexibility") or "Unspecified",
                "temperature": item.get("temperature") or "hot",
            }
            for item in items
        ]
        snapshots.append(
            {
                "company_id": token,
                "company_name": items[0].get("companyName") or token,
                "total_openings": len(items),
                "highest_temperature": row.get("highestTemperature") or "hot",
                "very_hot": int(row.get("veryHot") or 0),
                "hot": int(row.get("hot") or 0),
                "industry": row.get("industry") or items[0].get("industry") or "Hiring",
                "location": row.get("location") or items[0].get("location") or "—",
                "country": row.get("country") or items[0].get("country") or COUNTRY_OTHER,
                "team_breakdown": row.get("teamBreakdown") or [],
                "facets": {
                    "teams": _facet_buckets(items, "team"),
                    "locations": _facet_buckets(items, "workLocation"),
                    "flexibilities": _facet_buckets(items, "workplaceFlexibility"),
                },
                "atoms": atoms,
                "last_detected_at": row.get("lastDetectedAt") or items[0].get("detectedAt"),
            }
        )
    return snapshots


def persist_company_hiring_signals(user_id: int) -> int:
    """Upsert commercial company signals for the current in-memory scan."""
    from app.repositories import company_hiring_repository

    rows = build_company_hiring_snapshots(user_id)
    company_hiring_repository.replace_for_user(user_id, rows)
    return len(rows)


def _company_rows_from_persisted(user_id: int) -> list[dict[str, Any]]:
    try:
        from app.repositories import company_hiring_repository

        signals = company_hiring_repository.list_for_user(user_id)
    except Exception:
        return []
    rows: list[dict[str, Any]] = []
    for signal in signals:
        detected = signal.get("last_detected_at") or signal.get("scanned_at")
        if hasattr(detected, "isoformat"):
            detected = detected.isoformat()
        rows.append(
            {
                "companyId": signal["company_id"],
                "companyName": signal["company_name"],
                "industry": signal.get("industry") or "Hiring",
                "location": signal.get("location") or "—",
                "country": signal.get("country") or COUNTRY_OTHER,
                "matchingCount": int(signal.get("total_openings") or 0),
                "veryHot": int(signal.get("very_hot") or 0),
                "hot": int(signal.get("hot") or 0),
                "highestTemperature": signal.get("highest_temperature") or "hot",
                "lastDetectedAt": detected,
                "types": ["hiring"],
                "teamBreakdown": signal.get("team_breakdown") or [],
            }
        )
    return rows


def _types_include_hiring(types: list[str] | None) -> bool:
    # None or [] means "all types" (same as _by_types). An empty list must not
    # skip commercial — that broke Overview "All" after restart when only DB
    # company rollups exist.
    if not types:
        return True
    return any(str(t).lower() == "hiring" for t in types)


def _filter_persisted_company_rows(
    rows: list[dict[str, Any]],
    *,
    countries: list[str] | None = None,
    detected_within_days: int | None = None,
) -> list[dict[str, Any]]:
    out = rows
    if countries:
        wanted = {str(c) for c in countries}
        out = [r for r in out if str(r.get("country") or "") in wanted]
    if detected_within_days:
        out = [
            r
            for r in out
            if _within_days(r.get("lastDetectedAt"), detected_within_days)
        ]
    return out


def _company_attention_from_persisted(
    user_id: int,
    *,
    countries: list[str] | None = None,
    detected_within_days: int | None = None,
) -> list[dict[str, Any]]:
    """Overview Needs Attention rows from saved company rollups (no job list)."""
    rows = _filter_persisted_company_rows(
        _company_rows_from_persisted(user_id),
        countries=countries,
        detected_within_days=detected_within_days,
    )
    items: list[dict[str, Any]] = []
    for row in rows:
        count = int(row.get("matchingCount") or 0)
        name = row["companyName"]
        token = row["companyId"]
        teams = row.get("teamBreakdown") or []
        badges = [teams[0]["name"]] if teams else [f"{count} open roles"]
        detected = row.get("lastDetectedAt")
        items.append(
            {
                "kind": "company",
                "id": f"company:{token}",
                "title": f"Hiring activity at {name}",
                "companyId": token,
                "companyName": name,
                "type": "hiring",
                "temperature": row.get("highestTemperature") or "hot",
                "summary": f"{name} has {count} open role{'s' if count != 1 else ''}.",
                "rationale": f"{name} has {count} open role{'s' if count != 1 else ''}.",
                "signals": badges,
                "teamBreakdown": teams,
                "industry": row.get("industry") or "Hiring",
                "location": row.get("location") or "—",
                "country": row.get("country") or COUNTRY_OTHER,
                "detectedAt": detected,
                "deadline": None,
                "sourceId": _SOURCE_JOB_BOARD,
                "sourceUrl": None,
                "outreachStatus": "not_contacted",
                "lastContactedAt": None,
                "assignedToId": None,
                "assignedToName": None,
                "assignedAt": None,
                "signalCount": count,
                "newRoles": 0,
                "priorRoles": 0,
                "growth": None,
                "surge": False,
                "badges": badges,
            }
        )
    return _decorate_ownership(user_id, items)


def list_opportunity_companies(*, user_id: int, params: Any) -> dict[str, Any]:
    """Company-first Opportunities index. Counts respect title_match + detected + filters."""
    # Rollups are refreshed when Radar finishes; avoid blocking the index on upsert.
    live_hiring = [i for i in _opportunities(user_id) if i.get("type") == "hiring"]
    if live_hiring:
        items = filter_opportunities(live_hiring, params)
        rows = _rollup_companies(items)
    else:
        rows = _company_rows_from_persisted(user_id)

    company_q = _one_of(params, "company_q")
    if company_q:
        needle = company_q.strip().lower()
        rows = [
            r
            for r in rows
            if needle in r["companyName"].lower()
            or needle in str(r.get("industry") or "").lower()
            or needle in str(r.get("location") or "").lower()
        ]
    sort_key = _one_of(params, "sort_by")
    if sort_key == "companyName":
        reverse = (_one_of(params, "sort_dir") or "asc").lower() == "desc"
        rows = sorted(rows, key=lambda r: r["companyName"].lower(), reverse=reverse)
    elif sort_key == "matchingCount":
        reverse = (_one_of(params, "sort_dir") or "desc").lower() == "desc"
        rows = sorted(rows, key=lambda r: r["matchingCount"], reverse=reverse)
    elif sort_key == "lastDetectedAt":
        reverse = (_one_of(params, "sort_dir") or "desc").lower() == "desc"
        rows = sorted(
            rows,
            key=lambda r: str(r.get("lastDetectedAt") or ""),
            reverse=reverse,
        )
    rows = _decorate_company_rows(user_id, rows)
    return _paginate(rows, params)


def source_url_for(*, user_id: int, opportunity_id: str) -> str | None:
    """The real upstream posting URL, for the redirect endpoint only.

    Kept out of every serialised payload: the domain alone identifies the
    collector, which is exactly what must not reach the client.
    """
    wanted = str(opportunity_id)
    if wanted.startswith("curated:"):
        curated = curated_opportunity_service.get_for_workspace(
            workspace_id=user_id,
            opportunity_id=wanted,
        )
        return str(curated.get("sourceUrl") or "") or None if curated else None

    jobs, _ = _load(user_id)
    for row in jobs:
        row_id = str(row.get("external_job_id") or row.get("id") or "")
        if row_id == wanted:
            return str(row.get("url") or "") or None
    return None


def get_opportunity(*, user_id: int, opportunity_id: str) -> dict[str, Any] | None:
    wanted = str(opportunity_id)

    if wanted.startswith("company:"):
        company = company_as_opportunity(user_id=user_id, company_id=wanted)
        return _decorate_ownership(user_id, [company])[0] if company else None

    if wanted.startswith("curated:"):
        curated = curated_opportunity_service.get_for_workspace(
            workspace_id=user_id,
            opportunity_id=wanted,
        )
        return _decorate_ownership(user_id, [curated])[0] if curated else None

    jobs, vendors = _load(user_id)
    mapped = _decorate_ownership(user_id, [map_opportunity(row) for row in jobs])
    found = next((item for item in mapped if item["id"] == wanted), None)
    if found:
        matched = match_vendors_to_tenders(
            [
                {
                    **found,
                    "agency_name": found["companyName"],
                    "naics": found.get("naics"),
                    "category": found["industry"],
                }
            ],
            vendors,
        )
        suggested = matched[0].get("suggested_vendors") if matched else []
        return {**found, "suggestedVendors": [_map_suggested_vendor(v) for v in suggested or []]}

    # Commercial table may request the employer token directly.
    company = company_as_opportunity(user_id=user_id, company_id=wanted)
    return _decorate_ownership(user_id, [company])[0] if company else None


# ------------------------------------------------------------------ vendors


def _agency_rollup(user_id: int) -> list[dict[str, Any]]:
    """Each buying agency becomes an OP vendor row with its tender roll-up."""
    items = _opportunities(user_id)
    industries: dict[str, Counter] = defaultdict(Counter)
    locations: dict[str, Counter] = defaultdict(Counter)
    for item in items:
        industries[item["companyId"]][item["industry"]] += 1
        locations[item["companyId"]][item["location"]] += 1

    by_token: dict[str, dict[str, Any]] = {}
    for item in items:
        token = item["companyId"]
        row = by_token.get(token)
        if not row:
            # An agency buys across states and categories; show its most common.
            location = locations[token].most_common(1)[0][0]
            row = {
                "id": token,
                "name": item["companyName"],
                "industry": industries[token].most_common(1)[0][0],
                "location": location,
                "headquarters": location,
                "vendorStatus": "prospective",
                "description": (
                    "Employer publishing open roles on a public job board."
                    if item["type"] == "hiring"
                    else "Federal buying agency publishing notices on a "
                    "government procurement portal."
                ),
                "activeOpportunities": 0,
                "veryHot": 0,
                "hot": 0,
                "assignedOpportunities": 0,
                "teamContacts": 0,
                "highestTemperature": None,
                "lastActivityAt": None,
            }
            by_token[token] = row
        row["activeOpportunities"] += 1
        if item["temperature"] == "very_hot":
            row["veryHot"] += 1
        else:
            row["hot"] += 1
        if row["highestTemperature"] is None or _TEMPERATURE_ORDER.get(
            item["temperature"], 9
        ) < _TEMPERATURE_ORDER.get(row["highestTemperature"], 9):
            row["highestTemperature"] = item["temperature"]
        detected = item.get("detectedAt")
        if detected and (row["lastActivityAt"] is None or detected > row["lastActivityAt"]):
            row["lastActivityAt"] = detected
    return sorted(by_token.values(), key=lambda r: (-r["activeOpportunities"], r["name"].lower()))


def list_vendors(*, user_id: int, params: Any) -> dict[str, Any]:
    rows = _agency_rollup(user_id)
    search = _one_of(params, "q") or _one_of(params, "search")
    industries = _list_of(params, "industry")
    if search:
        needle = search.lower()
        rows = [r for r in rows if needle in f"{r['name']} {r['industry']} {r['location']}".lower()]
    if industries:
        rows = [r for r in rows if r["industry"] in industries]
    if (_one_of(params, "has_active_opportunities") or "").lower() in {"1", "true", "yes"}:
        rows = [r for r in rows if r["activeOpportunities"] > 0]
    return _paginate(rows, params)


def get_vendor(*, user_id: int, vendor_id: str) -> dict[str, Any] | None:
    return next((r for r in _agency_rollup(user_id) if r["id"] == str(vendor_id)), None)


# ---------------------------------------------------------------- dashboard


def _by_types(items: list[dict[str, Any]], types: list[str] | None) -> list[dict[str, Any]]:
    if not types:
        return items
    return [i for i in items if i["type"] in types]


def _detected_within(
    items: list[dict[str, Any]], days: int | None
) -> list[dict[str, Any]]:
    if not days or days <= 0:
        return items
    return [i for i in items if _within_days(i.get("detectedAt"), days)]


def _by_countries(
    items: list[dict[str, Any]], countries: list[str] | None
) -> list[dict[str, Any]]:
    if not countries:
        return items
    wanted = {str(c).strip().upper() for c in countries}
    return [i for i in items if i["country"] in wanted]


def scope_from_params(params: Any) -> dict[str, Any]:
    """The category, country and date-range scope every Overview widget shares."""
    return {
        "types": _list_of(params, "type"),
        "detected_within_days": _int_of(params, "detected_within_days"),
        "countries": _list_of(params, "country"),
    }


def _scoped(
    user_id: int,
    types: list[str] | None = None,
    detected_within_days: int | None = None,
    countries: list[str] | None = None,
) -> list[dict[str, Any]]:
    items = _by_countries(_by_types(_opportunities(user_id), types), countries)
    return _detected_within(items, detected_within_days)


def dashboard_metrics(
    *,
    user_id: int,
    actor_id: int | None = None,
    types: list[str] | None = None,
    detected_within_days: int | None = None,
    countries: list[str] | None = None,
) -> dict[str, Any]:
    # Filtered once by type and country so the weekly caption below can reuse
    # the list without a second trip to the database.
    # Company rollups are written at the end of each Radar run — do not re-persist
    # on every Overview poll (that blocked the UI past the client timeout).
    typed = _by_countries(_by_types(_opportunities(user_id), types), countries)
    items = _detected_within(typed, detected_within_days)

    # Opportunities = each government notice + each commercial company.
    # Openings = individual commercial jobs (shown on the Hot card).
    notices = [i for i in items if i["type"] != "hiring"]
    openings = [i for i in items if i["type"] == "hiring"]
    very_hot_opps = [i for i in notices if i["temperature"] == "very_hot"]

    notices_this_week = sum(
        1 for i in typed if i["type"] != "hiring" and _within_days(i.get("detectedAt"), 7)
    )

    if openings:
        commercial_companies = {i["companyId"] for i in openings if i.get("companyId")}
        total_openings = len(openings)
        companies_this_week = {
            i["companyId"]
            for i in typed
            if i["type"] == "hiring"
            and i.get("companyId")
            and _within_days(i.get("detectedAt"), 7)
        }
    elif _types_include_hiring(types):
        # Memory empty after restart — use saved company rollups (no job rows).
        persisted = _filter_persisted_company_rows(
            _company_rows_from_persisted(user_id),
            countries=countries,
            detected_within_days=detected_within_days,
        )
        commercial_companies = {r["companyId"] for r in persisted}
        total_openings = sum(int(r.get("matchingCount") or 0) for r in persisted)
        # "This week" ignores the selected detected range (same as live path).
        week_pool = _filter_persisted_company_rows(
            _company_rows_from_persisted(user_id),
            countries=countries,
            detected_within_days=None,
        )
        companies_this_week = {
            r["companyId"]
            for r in week_pool
            if _within_days(r.get("lastDetectedAt"), 7)
        }
    else:
        commercial_companies = set()
        total_openings = 0
        companies_this_week = set()

    me = str(actor_id if actor_id is not None else user_id)
    mine = [
        lead
        for lead in _workspace_leads(
            user_id=user_id,
            types=types,
            detected_within_days=detected_within_days,
            countries=countries,
        )
        if str(lead.get("assignedToId") or "") == me
    ]
    assigned_to_me = len(mine)
    assigned_to_me_not_contacted = sum(
        1 for lead in mine if lead.get("outreachStatus") in {None, "not_contacted"}
    )

    return {
        "totalVendors": len(_agency_rollup(user_id)),
        "totalOpportunities": len(notices) + len(commercial_companies),
        "totalOpenings": total_openings,
        # Deliberately ignores the range so "this week" keeps meaning a week
        # even when the user narrows the window to 24 hours.
        "opportunitiesAddedThisWeek": notices_this_week + len(companies_this_week),
        "veryHot": len(very_hot_opps),
        "veryHotNeedingAttention": sum(
            1
            for i in very_hot_opps
            if not i.get("assignedToId")
        ),
        # Hot = commercial companies with hiring (Greenhouse / Lever / Ashby).
        # hotUnassigned keeps total open roles for the card caption.
        "hot": len(commercial_companies),
        "hotUnassigned": total_openings,
        "assignedToMe": assigned_to_me,
        "assignedToMeNotContacted": assigned_to_me_not_contacted,
        "contactedThisWeek": 0,
        "contactedByMeThisWeek": 0,
    }


def pipeline_summary(*, user_id: int, actor_id: int | None = None) -> dict[str, Any]:
    me = str(actor_id if actor_id is not None else user_id)
    mine = [
        lead
        for lead in _workspace_leads(user_id=user_id)
        if str(lead.get("assignedToId") or "") == me
    ]
    needs = sum(1 for lead in mine if lead.get("outreachStatus") in {None, "not_contacted"})
    contacted = sum(1 for lead in mine if lead.get("outreachStatus") == "contacted")
    follow = sum(1 for lead in mine if lead.get("outreachStatus") == "follow_up_required")
    return {
        "assigned": len(mine),
        "needsOutreach": needs,
        "contacted": contacted,
        "followUp": follow,
    }


def _workspace_leads(
    *,
    user_id: int,
    types: list[str] | None = None,
    detected_within_days: int | None = None,
    countries: list[str] | None = None,
) -> list[dict[str, Any]]:
    """Government notices plus one row per commercial company."""
    items = _scoped(user_id, types, detected_within_days, countries)
    notices = [i for i in items if i.get("type") != "hiring"]
    hiring = [i for i in items if i.get("type") == "hiring"]
    if hiring:
        companies = _decorate_ownership(user_id, _company_signals(hiring))
    elif _types_include_hiring(types):
        companies = _company_attention_from_persisted(
            user_id,
            countries=countries,
            detected_within_days=detected_within_days,
        )
    else:
        companies = []
    return notices + companies


_SURGE_WINDOW_DAYS = 14
# Carried over from the older radar project, which settled on a quarter's
# growth as the point where hiring reads as a surge rather than normal churn.
_SURGE_GROWTH_THRESHOLD = 0.25
# Under this, a "surge" is one or two roles, which is noise rather than signal.
_SURGE_MIN_RECENT = 5


def _posted_between(item: dict[str, Any], now: datetime, lo: int, hi: int) -> bool:
    """True when the role was posted between `lo` and `hi` days ago."""
    parsed = _parse_dt(item.get("detectedAt"))
    if not parsed:
        return False
    return now - timedelta(days=hi) <= parsed < now - timedelta(days=lo)


def _company_signals(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Collapses job-board roles into one row per employer.

    Two hundred open roles at one company is a single lead, not two hundred of
    them, so the dashboard ranks the employer instead of the postings.

    Growth compares the last fortnight against the one before it, read from
    each role's own posting date. A board only lists roles that are still open,
    so the older window undercounts and growth reads a little high — good
    enough to rank on, not a precise figure.
    """
    now = datetime.now(timezone.utc)
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in items:
        groups[str(item.get("companyId") or "unknown")].append(item)

    rows: list[dict[str, Any]] = []
    for token, group in groups.items():
        recent = sum(1 for i in group if _posted_between(i, now, 0, _SURGE_WINDOW_DAYS))
        prior = sum(
            1
            for i in group
            if _posted_between(i, now, _SURGE_WINDOW_DAYS, _SURGE_WINDOW_DAYS * 2)
        )
        # No prior baseline means everything is new, which counts as growth
        # rather than as an unknown.
        growth = (recent - prior) / prior if prior else (1.0 if recent else None)
        surge = recent >= _SURGE_MIN_RECENT and growth is not None and (
            growth >= _SURGE_GROWTH_THRESHOLD
        )

        first = group[0]
        name = first.get("companyName") or token
        detected = max((_iso(i.get("detectedAt")) or "" for i in group), default="") or None
        countries = Counter(i.get("country") for i in group if i.get("country"))
        locations = Counter(i.get("location") for i in group if i.get("location"))
        teams = Counter(
            str(i.get("team")).strip() for i in group if str(i.get("team") or "").strip()
        )
        top_teams = [{"name": n, "count": c} for n, c in teams.most_common(5)]
        badges = ["Hiring surge"] if surge else []
        if top_teams:
            badges.append(top_teams[0]["name"])

        rows.append(
            {
                **{k: None for k in ("deadline", "assignedToId", "assignedToName", "assignedAt")},
                "kind": "company",
                "id": f"company:{token}",
                "title": f"Hiring activity at {name}",
                "companyId": token,
                "companyName": name,
                "type": "hiring",
                "temperature": "very_hot" if surge else "hot",
                "summary": f"{recent} of {len(group)} open roles posted in the last "
                f"{_SURGE_WINDOW_DAYS} days.",
                "rationale": f"{name} has {len(group)} open roles"
                + (f", {recent} of them in the last {_SURGE_WINDOW_DAYS} days" if recent else "")
                + ".",
                "signals": badges or [f"{len(group)} open roles"],
                "teamBreakdown": top_teams,
                "industry": "Hiring",
                "location": (locations.most_common(1)[0][0] if locations else "—"),
                "country": (countries.most_common(1)[0][0] if countries else COUNTRY_OTHER),
                "detectedAt": detected,
                "sourceId": first.get("sourceId"),
                "sourceUrl": None,
                "outreachStatus": "not_contacted",
                "lastContactedAt": None,
                # Company-only fields the notice rows do not carry.
                "signalCount": len(group),
                "newRoles": recent,
                "priorRoles": prior,
                "growth": round(growth, 2) if growth is not None else None,
                "surge": surge,
                "badges": badges,
            }
        )
    return rows


def needs_attention(
    *,
    user_id: int,
    limit: int = 6,
    types: list[str] | None = None,
    detected_within_days: int | None = None,
    countries: list[str] | None = None,
) -> dict[str, Any]:
    """Closing tenders first, then employers ranked by hiring signal.

    Notices and companies are deliberately mixed: a tender closing tomorrow is
    more urgent than any hiring trend, but a surging employer outranks a tender
    that is months away.
    """
    # Persist happens on Radar completion; skip here so Overview stays responsive.
    items = _scoped(user_id, types, detected_within_days, countries)
    notices = [i for i in items if i["type"] != "hiring"]
    live_hiring = [i for i in items if i["type"] == "hiring"]
    if live_hiring:
        companies = _company_signals(live_hiring)
    elif _types_include_hiring(types):
        companies = _company_attention_from_persisted(
            user_id,
            countries=countries,
            detected_within_days=detected_within_days,
        )
    else:
        companies = []

    closing = [
        i
        for i in notices
        if (_days_until(i.get("deadline")) is not None and _days_until(i["deadline"]) >= 0)
    ]
    closing.sort(key=lambda i: _days_until(i["deadline"]) or 0)

    surging = sorted(
        (c for c in companies if c["surge"]),
        key=lambda c: (-c["newRoles"], -c["signalCount"]),
    )
    steady = sorted((c for c in companies if not c["surge"]), key=lambda c: -c["signalCount"])
    undated = sorted((i for i in notices if i not in closing), key=_by_priority)

    ordered = closing + surging + undated + steady
    decorated = _decorate_ownership(
        user_id,
        [row if row.get("kind") else {**row, "kind": "notice"} for row in ordered],
    )
    return {"items": decorated[: max(1, limit)]}


def upcoming_deadlines(
    *,
    user_id: int,
    limit: int = 6,
    types: list[str] | None = None,
    detected_within_days: int | None = None,
    countries: list[str] | None = None,
) -> dict[str, Any]:
    items = [
        i
        for i in _scoped(user_id, types, detected_within_days, countries)
        if _days_until(i.get("deadline")) is not None and (_days_until(i["deadline"]) or 0) >= 0
    ]
    items.sort(key=lambda i: _days_until(i["deadline"]) or 0)
    return {"items": items[: max(1, limit)]}


def dashboard_overview(
    *,
    user_id: int,
    actor_id: int | None = None,
    types: list[str] | None = None,
    detected_within_days: int | None = None,
    countries: list[str] | None = None,
    attention_limit: int = 8,
    deadlines_limit: int = 5,
) -> dict[str, Any]:
    """One round-trip for Overview: metrics + pipeline + attention + deadlines.

    Shares the per-request `_opportunities` memo so the job set is built once.
    """
    return {
        "metrics": dashboard_metrics(
            user_id=user_id,
            actor_id=actor_id,
            types=types,
            detected_within_days=detected_within_days,
            countries=countries,
        ),
        "pipeline": pipeline_summary(user_id=user_id, actor_id=actor_id),
        "needsAttention": needs_attention(
            user_id=user_id,
            limit=attention_limit,
            types=types,
            detected_within_days=detected_within_days,
            countries=countries,
        ),
        "deadlines": upcoming_deadlines(
            user_id=user_id,
            limit=deadlines_limit,
            types=types,
            detected_within_days=detected_within_days,
            countries=countries,
        ),
    }


# -------------------------------------------------------- CRM-shaped stubs


def team_activity(
    *, user_id: int, limit: int = 20, types: list[str] | None = None
) -> dict[str, Any]:
    try:
        from app.repositories import outreach_repository

        items = outreach_repository.list_team_activity(user_id=user_id, limit=max(limit, 50))
        if types:
            wanted = {str(t) for t in types}
            items = [i for i in items if i.get("type") in wanted]
        return {"items": items[:limit]}
    except Exception:
        return {"items": []}


def my_assignments(*, user_id: int, actor_id: int | None = None) -> dict[str, Any]:
    me = str(actor_id if actor_id is not None else user_id)
    items = [
        lead
        for lead in _workspace_leads(user_id=user_id)
        if str(lead.get("assignedToId") or "") == me
    ]
    return {"items": items}


def assign_opportunity(
    *,
    user_id: int,
    opportunity_id: str,
    actor_id: int | None = None,
    assignee_id: int | None = None,
) -> dict[str, Any]:
    """Assign an opportunity to the actor or another seat in the same workspace."""
    from fastapi import HTTPException, status

    from app.db.connection import transaction
    from app.repositories import assignment_repository, user_repository
    from app.repositories import outreach_repository

    wanted = str(opportunity_id or "").strip()
    if not wanted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="opportunityId required")
    found = get_opportunity(user_id=user_id, opportunity_id=wanted)
    if not found:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")

    actor_pk = int(actor_id if actor_id is not None else user_id)
    target_pk = int(assignee_id) if assignee_id is not None else actor_pk

    workspace_id = user_id
    try:
        seats = user_repository.list_workspace_members(workspace_id)
        member_ids = {int(row["id"]) for row in seats} or {workspace_id, actor_pk}
    except Exception:
        member_ids = {workspace_id, actor_pk}

    if target_pk not in member_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Assignee must be a member of this workspace",
        )

    target = user_repository.find_by_id(target_pk) or {}
    target_name = str(target.get("name") or "Teammate")
    actor = user_repository.find_by_id(actor_pk) or {}
    actor_name = str(actor.get("name") or "You")
    title = found.get("title") or found.get("companyName") or wanted
    if target_pk == actor_pk:
        message = f"{actor_name} assigned this to themselves."
    else:
        message = f"{actor_name} assigned this to {target_name}."

    with transaction() as conn:
        assignment_repository.upsert(
            user_id=user_id,
            opportunity_id=wanted,
            assigned_to_id=target_pk,
            assigned_to_name=target_name,
            conn=conn,
        )
        outreach_repository.create_activity(
            user_id=user_id,
            opportunity_id=wanted,
            opportunity_title=title,
            type="assigned" if target_pk == actor_pk else "reassigned",
            actor_id=actor_pk,
            actor_name=actor_name,
            message=message,
            detail=None,
            channel=None,
            conn=conn,
        )
    refreshed = get_opportunity(user_id=user_id, opportunity_id=wanted)
    assert refreshed is not None
    return refreshed


def assign_to_me(
    *, user_id: int, opportunity_id: str, actor_id: int | None = None
) -> dict[str, Any]:
    """Back-compat wrapper — assigns to the acting user."""
    return assign_opportunity(
        user_id=user_id,
        opportunity_id=opportunity_id,
        actor_id=actor_id,
        assignee_id=actor_id,
    )

def unassign(
    *, user_id: int, opportunity_id: str, actor_id: int | None = None
) -> dict[str, Any]:
    from fastapi import HTTPException, status

    from app.db.connection import transaction
    from app.repositories import assignment_repository
    from app.repositories import outreach_repository
    from app.repositories import user_repository

    wanted = str(opportunity_id or "").strip()
    if not wanted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="opportunityId required")
    found = get_opportunity(user_id=user_id, opportunity_id=wanted)
    if not found:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")
    actor_pk = int(actor_id if actor_id is not None else user_id)
    actor = user_repository.find_by_id(actor_pk) or {}
    actor_name = str(actor.get("name") or "You")
    title = found.get("title") or found.get("companyName") or wanted
    with transaction() as conn:
        assignment_repository.delete(user_id=user_id, opportunity_id=wanted, conn=conn)
        outreach_repository.create_activity(
            user_id=user_id,
            opportunity_id=wanted,
            opportunity_title=title,
            type="unassigned",
            actor_id=actor_pk,
            actor_name=actor_name,
            message=f"{actor_name} removed the assignment.",
            detail=None,
            channel=None,
            conn=conn,
        )
    refreshed = get_opportunity(user_id=user_id, opportunity_id=wanted)
    assert refreshed is not None
    refreshed["assignedToId"] = None
    refreshed["assignedToName"] = None
    refreshed["assignedAt"] = None
    return refreshed


def list_assignments(*, user_id: int, opportunity_id: str) -> dict[str, Any]:
    from app.repositories import assignment_repository

    row = assignment_repository.get(user_id=user_id, opportunity_id=str(opportunity_id))
    if not row:
        return {"items": []}
    return {
        "items": [
            {
                "id": row["opportunityId"],
                "userId": row["assignedToId"],
                "userName": row["assignedToName"],
                "assignedAt": row["assignedAt"],
            }
        ]
    }


def team_ownership(*, user_id: int) -> dict[str, Any]:
    return {"items": []}


def notifications(*, actor_id: int) -> dict[str, Any]:
    from app.services import notification_service

    return notification_service.list_for_actor(actor_user_id=actor_id)


def notification_mark_read(*, actor_id: int, notification_id: str) -> dict[str, Any]:
    from app.services import notification_service

    return notification_service.mark_read(
        actor_user_id=actor_id, notification_id=notification_id
    )


def notifications_mark_all_read(*, actor_id: int) -> dict[str, Any]:
    from app.services import notification_service

    return notification_service.mark_all_read(actor_user_id=actor_id)


def saved_views(*, user_id: int) -> dict[str, Any]:
    return {"items": []}


def saved_opportunities(*, user_id: int) -> dict[str, Any]:
    return {"items": []}


def opportunity_activity(*, user_id: int, opportunity_id: str) -> dict[str, Any]:
    try:
        from app.repositories import outreach_repository

        return {
            "items": outreach_repository.list_activity_for_opportunity(
                user_id=user_id, opportunity_id=str(opportunity_id), limit=100
            )
        }
    except Exception:
        return {"items": []}


def outreach_for_opportunity(*, user_id: int, opportunity_id: str) -> dict[str, Any]:
    try:
        from app.repositories import outreach_repository

        return {
            "items": outreach_repository.list_outreach_for_opportunity(
                user_id=user_id, opportunity_id=str(opportunity_id), limit=50
            )
        }
    except Exception:
        return {"items": []}


def send_outreach(*, user_id: int, payload: dict[str, Any], actor_id: int | None = None) -> dict[str, Any]:
    """Compose → SMTP deliver → persist message + activity → return updated opportunity."""
    from fastapi import HTTPException, status

    from app.repositories import outreach_repository, user_repository
    from app.services import email_service

    opportunity_id = str(payload.get("opportunityId") or "").strip()
    to_email = str(payload.get("to") or "").strip()
    subject = str(payload.get("subject") or "").strip()
    body = str(payload.get("body") or "").strip()
    channel = str(payload.get("channel") or "email").strip() or "email"
    from_email = str(payload.get("from") or "").strip()

    if not opportunity_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="opportunityId required")
    if not to_email or "@" not in to_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Valid recipient required")
    if len(subject) < 3:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subject required")
    if len(body) < 20:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message body too short")

    opportunity = get_opportunity(user_id=user_id, opportunity_id=opportunity_id)
    if not opportunity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found")

    user = user_repository.find_by_id(user_id) or {}
    sender_name = str(user.get("name") or "User")
    sender_email = from_email or str(user.get("email") or "")
    if not sender_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sender email required")

    if not email_service.email_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email delivery is not configured",
        )

    try:
        email_service.send_outreach_email(
            to_email=to_email,
            subject=subject,
            body=body,
            reply_to=sender_email,
        )
        send_status = "sent"
        error_detail = None
    except Exception as exc:
        outreach_repository.create_outreach(
            user_id=user_id,
            opportunity_id=opportunity_id,
            opportunity_title=opportunity.get("title"),
            company_name=opportunity.get("companyName"),
            sender_email=sender_email,
            sender_name=sender_name,
            recipient_email=to_email,
            subject=subject,
            body=body,
            channel=channel,
            status="failed",
            error_detail=str(exc)[:300],
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Email could not be delivered",
        ) from exc

    outreach = outreach_repository.create_outreach(
        user_id=user_id,
        opportunity_id=opportunity_id,
        opportunity_title=opportunity.get("title"),
        company_name=opportunity.get("companyName"),
        sender_email=sender_email,
        sender_name=sender_name,
        recipient_email=to_email,
        subject=subject,
        body=body,
        channel=channel,
        status=send_status,
        error_detail=error_detail,
        matched_count=opportunity.get("signalCount"),
        hiring_filters=opportunity.get("hiringFilters"),
    )

    outreach_repository.create_activity(
        user_id=user_id,
        opportunity_id=opportunity_id,
        opportunity_title=opportunity.get("title"),
        type="contacted",
        actor_id=int(actor_id if actor_id is not None else user_id),
        actor_name=sender_name,
        message=f"{sender_name} sent outreach to {to_email}",
        detail=subject,
        channel=channel,
    )

    updated = {
        **opportunity,
        "outreachStatus": "contacted",
        "lastContactedAt": outreach.get("sentAt"),
        "lastContactedById": str(actor_id if actor_id is not None else user_id),
        "lastContactedByName": sender_name,
        "lastContactChannel": channel,
    }
    return {"outreach": outreach, "opportunity": updated}
