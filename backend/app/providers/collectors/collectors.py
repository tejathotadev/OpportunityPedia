"""All collector fetch logic in one file.

Add Greenhouse, Lever, Ashby, SAM, etc. here — do not create a new file per collector.
"""

from __future__ import annotations

import re
from datetime import date, timedelta
from typing import Any, Callable
from urllib.parse import quote

import httpx

from app.core.config import settings
from app.radar.heat import (
    HEAT_VERY_HOT,
    NAICS_CATEGORIES,
    SIGNAL_CONTRACT_AWARD,
    SIGNAL_GOVERNMENT_STAFFING,
    category_for_naics,
)

COLLECTORS: dict[str, dict[str, Any]] = {
    "greenhouse": {
        "enabled": True,
        "display_name": "Greenhouse",
        "api_url": "https://boards-api.greenhouse.io/v1/boards/{token}/jobs",
    },
    "lever": {
        "enabled": True,
        "display_name": "Lever",
        "api_url": "https://api.lever.co/v0/postings/{token}",
    },
    "ashby": {
        "enabled": True,
        "display_name": "Ashby",
        "api_url": "https://api.ashbyhq.com/posting-api/job-board/{token}",
    },
    "sam_gov": {
        "enabled": True,
        "display_name": "SAM.gov",
        "api_url": "https://api.sam.gov/opportunities/v2/search",
        "entity_api_url": "https://api.sam.gov/entity-information/v3/entities",
    },
}

# SAM opportunities v2 caps page size at 1000.
_SAM_PAGE_SIZE = 1000
# SAM rejects a posted range wider than a year and counts both endpoints, so
# 365 days back is 366 inclusive and answers HTTP 400. 364 is the real ceiling.
_SAM_MAX_LOOKBACK_DAYS = 364


def _str_or_none(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _agency_token(agency: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", agency.lower()).strip("-")
    return (slug or "agency")[:120]


def _posted_window(days: int) -> tuple[date, date]:
    today = date.today()
    start = today - timedelta(days=max(1, min(days, _SAM_MAX_LOOKBACK_DAYS)))
    return start, today


def _effective_deadline(item: dict[str, Any]) -> str | None:
    """The date a notice stops taking interest.

    Most notices publish a response deadline. Those that do not still go
    inactive on `archiveDate`, resolved by SAM from the notice's `archiveType`
    policy ("30 days after published date" and friends). A blank response date
    means "no stated cutoff", not "expired", so the archive date is what
    decides — otherwise these notices look like they have no deadline at all.
    """
    return (
        _str_or_none(item.get("responseDeadLine"))
        or _str_or_none(item.get("responseDeadline"))
        or _str_or_none(item.get("archiveDate"))
    )


def _deadline_passed(item: dict[str, Any]) -> bool:
    """True when the response deadline or inactive date is already past."""
    raw = _effective_deadline(item)
    if not raw:
        return False
    match = re.match(r"(\d{4})-(\d{2})-(\d{2})", raw)
    if not match:
        return False
    try:
        deadline = date(int(match.group(1)), int(match.group(2)), int(match.group(3)))
    except ValueError:
        return False
    return deadline < date.today()


def _extract_naics(item: dict[str, Any]) -> str | None:
    for key in ("naicsCode", "naics", "ncode"):
        raw = item.get(key)
        if raw is None:
            continue
        if isinstance(raw, list) and raw:
            raw = raw[0]
        if isinstance(raw, dict):
            raw = raw.get("code") or raw.get("naicsCode")
        text = _str_or_none(raw)
        if text:
            digits = re.sub(r"\D", "", text)
            if digits:
                return digits[:6]
    return None


def _extract_agency(item: dict[str, Any]) -> str:
    path = _str_or_none(item.get("fullParentPathName"))
    if path:
        parts = [p.strip() for p in re.split(r"[.>|/]+", path) if p.strip()]
        if parts:
            return parts[0][:255]
    for key in ("department", "organizationName", "office"):
        value = _str_or_none(item.get(key))
        if value:
            return value[:255]
    return "SAM.gov Agency"


def _agency_path_parts(item: dict[str, Any]) -> list[str]:
    path = _str_or_none(item.get("fullParentPathName"))
    if not path:
        return []
    return [p.strip() for p in re.split(r"[.>|/]+", path) if p.strip()]


def _format_office_address(item: dict[str, Any]) -> str | None:
    raw = item.get("officeAddress")
    if isinstance(raw, str) and raw.strip():
        return raw.strip()
    if not isinstance(raw, dict):
        return None
    city = _str_or_none(raw.get("city"))
    state = _str_or_none(raw.get("state"))
    zipcode = _str_or_none(raw.get("zipcode") or raw.get("zip"))
    country = _str_or_none(raw.get("countryCode") or raw.get("country"))
    line = ", ".join(part for part in (city, state, zipcode) if part)
    if country and country.upper() not in {"USA", "US"}:
        line = f"{line}, {country}" if line else country
    return line or None


def _extract_primary_contact(item: dict[str, Any]) -> dict[str, str] | None:
    """SAM search already includes POC — no second API call."""
    raw = item.get("pointOfContact")
    contacts: list[Any]
    if isinstance(raw, list):
        contacts = raw
    elif isinstance(raw, dict):
        contacts = [raw]
    else:
        contacts = []
    primary: dict[str, Any] | None = None
    for node in contacts:
        if not isinstance(node, dict):
            continue
        kind = str(node.get("type") or "").strip().lower()
        if kind == "primary" or primary is None:
            primary = node
            if kind == "primary":
                break
    if not primary:
        return None
    name = _str_or_none(primary.get("fullName") or primary.get("name"))
    email = _str_or_none(primary.get("email"))
    phone = _str_or_none(primary.get("phone"))
    title = _str_or_none(primary.get("title"))
    if not (name or email or phone):
        return None
    out: dict[str, str] = {}
    if name:
        out["name"] = name
    if title:
        out["jobTitle"] = title
    if email:
        out["email"] = email
    if phone:
        out["phone"] = phone
    return out


def _attachment_name_from_url(url: str, index: int) -> str:
    from urllib.parse import unquote, urlparse

    path = unquote(urlparse(url).path or "")
    name = path.rsplit("/", 1)[-1].strip() if path else ""
    if name and name.lower() not in {"download", "resources", "resource", "view"}:
        return name[:200]
    return f"Attachment {index}"


def _strip_secret_query(url: str) -> str:
    from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

    parsed = urlparse(url)
    kept = [(k, v) for k, v in parse_qsl(parsed.query, keep_blank_values=True) if k.lower() != "api_key"]
    return urlunparse(parsed._replace(query=urlencode(kept)))


def _extract_attachments(item: dict[str, Any]) -> list[dict[str, str]]:
    """Filenames from resourceLinks already present on the search row."""
    raw = item.get("resourceLinks")
    if not isinstance(raw, list):
        return []
    out: list[dict[str, str]] = []
    for index, entry in enumerate(raw, start=1):
        url = _str_or_none(entry) if not isinstance(entry, dict) else (
            _str_or_none(entry.get("url"))
            or _str_or_none(entry.get("href"))
            or _str_or_none(entry.get("link"))
        )
        if not url:
            continue
        safe = _strip_secret_query(url)
        name = _attachment_name_from_url(safe, index)
        if isinstance(entry, dict):
            name = (
                _str_or_none(entry.get("resourceName"))
                or _str_or_none(entry.get("fileName"))
                or _str_or_none(entry.get("name"))
                or name
            )
        out.append({"id": f"att-{index}", "name": name[:200], "samResourceUrl": safe})
    return out


def _build_tender_detail(item: dict[str, Any], *, notice_type: str, naics: str | None, category: str | None) -> dict[str, Any]:
    """Structured notice facts from the search payload (Plan A — no extra SAM calls)."""
    parts = _agency_path_parts(item)
    set_aside = (
        _str_or_none(item.get("typeOfSetAsideDescription"))
        or _str_or_none(item.get("typeOfSetAside"))
    )
    psc = _str_or_none(item.get("classificationCode"))
    solicitation = _str_or_none(item.get("solicitationNumber"))
    archive = _str_or_none(item.get("archiveDate"))
    contact = _extract_primary_contact(item)
    attachments = _extract_attachments(item)
    return {
        "noticeType": notice_type,
        "solicitationNumber": solicitation,
        "agencyPath": " · ".join(parts) if parts else None,
        "department": parts[0] if parts else _extract_agency(item),
        "subTier": parts[1] if len(parts) > 1 else None,
        "office": parts[2] if len(parts) > 2 else _str_or_none(item.get("office")),
        "setAside": set_aside,
        "psc": psc,
        "naics": naics,
        "category": category,
        "archiveDate": archive,
        "officeAddress": _format_office_address(item),
        "contact": contact,
        "attachments": attachments,
    }


def _extract_awardee(item: dict[str, Any]) -> tuple[str | None, str | None]:
    """Return (vendor_name, uei) from an award notice when present."""
    award = item.get("award")
    candidates: list[Any] = []
    if isinstance(award, dict):
        candidates.append(award.get("awardee"))
        candidates.append(award)
    candidates.append(item.get("awardee"))
    for node in candidates:
        if isinstance(node, list) and node:
            node = node[0]
        if not isinstance(node, dict):
            continue
        name = (
            _str_or_none(node.get("name"))
            or _str_or_none(node.get("legalBusinessName"))
            or _str_or_none(node.get("awardeeName"))
        )
        uei = (
            _str_or_none(node.get("ueiSAM"))
            or _str_or_none(node.get("uei"))
            or _str_or_none(node.get("uniqueEntityId"))
        )
        if name:
            return name[:255], uei
    # Fallback: some payloads put awardee as a plain string.
    plain = _str_or_none(item.get("awardeeName"))
    if plain:
        return plain[:255], None
    return None, None


def _parse_greenhouse_jobs(payload: Any) -> list[dict]:
    jobs_raw = payload.get("jobs") if isinstance(payload, dict) else payload
    if not isinstance(jobs_raw, list):
        return []
    jobs: list[dict] = []
    max_jobs = settings.RADAR_MAX_JOBS_PER_BOARD
    for item in jobs_raw[:max_jobs]:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "").strip()
        if not title:
            continue
        location = None
        loc = item.get("location")
        if isinstance(loc, dict):
            location = loc.get("name")
        elif isinstance(loc, str):
            location = loc
        department = None
        departments = item.get("departments") or []
        if isinstance(departments, list) and departments and isinstance(departments[0], dict):
            department = departments[0].get("name")
        posted_at = _str_or_none(item.get("first_published")) or _str_or_none(
            item.get("updated_at")
        )
        jobs.append(
            {
                "record_kind": "tender",
                "external_job_id": str(item.get("id") or title),
                "title": title,
                "location": str(location) if location else None,
                "department": str(department) if department else None,
                "url": _str_or_none(item.get("absolute_url")),
                "posted_at": posted_at,
                "updated_at": _str_or_none(item.get("updated_at")),
                "requisition_id": _str_or_none(item.get("requisition_id")),
            }
        )
    return jobs


def fetch_greenhouse(source: dict[str, Any], client: httpx.Client) -> tuple[list[dict], str | None]:
    meta = COLLECTORS.get("greenhouse") or {}
    api = str(meta.get("api_url") or "")
    token = str(source.get("token") or "")
    if not api or not token:
        return [], "missing api or token"
    url = api.format(token=token)
    try:
        response = client.get(url, params={"content": "false"})
    except Exception as exc:
        return [], f"{type(exc).__name__}"
    if response.status_code == 404:
        return [], "HTTP404"
    if response.status_code >= 400:
        return [], f"HTTP{response.status_code}"
    try:
        payload = response.json()
    except Exception:
        return [], "invalid_json"
    jobs_raw = payload.get("jobs") if isinstance(payload, dict) else payload
    if not isinstance(jobs_raw, list):
        return [], "no jobs list"
    return _parse_greenhouse_jobs(payload), None


def _parse_lever_jobs(payload: Any) -> list[dict]:
    items = payload if isinstance(payload, list) else (
        payload.get("data") if isinstance(payload, dict) else None
    )
    if not isinstance(items, list):
        return []
    jobs: list[dict] = []
    max_jobs = settings.RADAR_MAX_JOBS_PER_BOARD
    for item in items[:max_jobs]:
        if not isinstance(item, dict):
            continue
        title = str(item.get("text") or item.get("title") or "").strip()
        if not title:
            continue
        categories = item.get("categories") if isinstance(item.get("categories"), dict) else {}
        location = categories.get("location") if categories else item.get("location")
        department = None
        if categories:
            department = categories.get("team") or categories.get("department")
        posted_at = _str_or_none(item.get("createdAt")) or _str_or_none(item.get("updatedAt"))
        jobs.append(
            {
                "record_kind": "tender",
                "external_job_id": str(item.get("id") or title),
                "title": title,
                "location": str(location) if location else None,
                "department": str(department) if department else None,
                "url": _str_or_none(item.get("hostedUrl")) or _str_or_none(item.get("applyUrl")),
                "posted_at": posted_at,
                "updated_at": _str_or_none(item.get("updatedAt")),
                "requisition_id": None,
            }
        )
    return jobs


def fetch_lever(source: dict[str, Any], client: httpx.Client) -> tuple[list[dict], str | None]:
    meta = COLLECTORS.get("lever") or {}
    api = str(meta.get("api_url") or "")
    token = str(source.get("token") or "")
    if not api or not token:
        return [], "missing api or token"
    url = api.format(token=token)
    try:
        response = client.get(url, params={"mode": "json"})
    except Exception as exc:
        return [], f"{type(exc).__name__}"
    if response.status_code == 404:
        return [], "HTTP404"
    if response.status_code >= 400:
        return [], f"HTTP{response.status_code}"
    try:
        payload = response.json()
    except Exception:
        return [], "invalid_json"
    jobs = _parse_lever_jobs(payload)
    if not jobs:
        return [], "no jobs list"
    return jobs, None


def _parse_ashby_jobs(payload: Any) -> list[dict]:
    jobs_raw = payload.get("jobs") if isinstance(payload, dict) else payload
    if not isinstance(jobs_raw, list):
        return []
    jobs: list[dict] = []
    max_jobs = settings.RADAR_MAX_JOBS_PER_BOARD
    for item in jobs_raw[:max_jobs]:
        if not isinstance(item, dict):
            continue
        if item.get("isListed") is False:
            continue
        title = str(item.get("title") or "").strip()
        if not title:
            continue
        location = item.get("location")
        if isinstance(location, dict):
            location_text = location.get("name") or location.get("location")
        else:
            location_text = location
        department = None
        dept = item.get("department")
        if isinstance(dept, str):
            department = dept
        elif isinstance(dept, dict):
            department = dept.get("name")
        team = item.get("team")
        if not department and isinstance(team, str):
            department = team
        posted_at = _str_or_none(item.get("publishedAt")) or _str_or_none(
            item.get("updatedAt")
        )
        jobs.append(
            {
                "record_kind": "tender",
                "external_job_id": str(item.get("id") or item.get("jobId") or title),
                "title": title,
                "location": str(location_text) if location_text else None,
                "department": str(department) if department else None,
                "url": _str_or_none(item.get("jobUrl")) or _str_or_none(item.get("applyUrl")),
                "posted_at": posted_at,
                "updated_at": _str_or_none(item.get("updatedAt")),
                "requisition_id": None,
            }
        )
    return jobs


def fetch_ashby(source: dict[str, Any], client: httpx.Client) -> tuple[list[dict], str | None]:
    meta = COLLECTORS.get("ashby") or {}
    api = str(meta.get("api_url") or "")
    token = str(source.get("token") or "")
    if not api or not token:
        return [], "missing api or token"
    url = api.format(token=token)
    try:
        response = client.get(url)
    except Exception as exc:
        return [], f"{type(exc).__name__}"
    if response.status_code == 404:
        return [], "HTTP404"
    if response.status_code >= 400:
        return [], f"HTTP{response.status_code}"
    try:
        payload = response.json()
    except Exception:
        return [], "invalid_json"
    jobs = _parse_ashby_jobs(payload)
    if not jobs:
        return [], "no jobs list"
    return jobs, None


def _error_detail(response: httpx.Response, limit: int = 160) -> str:
    """SAM says why it refused a request in the body; the status code alone is
    not enough to act on, so carry the message into the run notes."""
    payload: Any = None
    try:
        payload = response.json()
    except Exception:
        payload = None

    text = ""
    if isinstance(payload, dict):
        for key in ("errorMessage", "message", "error_description", "detail"):
            text = _str_or_none(payload.get(key)) or ""
            if text:
                break
        if not text:
            error = payload.get("error")
            if isinstance(error, dict):
                text = _str_or_none(error.get("message")) or ""
            elif isinstance(error, str):
                text = error
    if not text:
        text = " ".join((response.text or "").split())
    return text[:limit] or "no detail"


def _sam_search(
    client: httpx.Client,
    *,
    api_key: str,
    naics_code: str,
    posted_from: date,
    posted_to: date,
    offset: int,
) -> tuple[list[dict], int, str | None]:
    """One page of opportunities for a single NAICS code.

    Returns (rows, total_records, error). `ncode` is the contracting officer's
    own classification, so it replaces the old title/keyword guessing.
    """
    meta = COLLECTORS.get("sam_gov") or {}
    url = str(meta.get("api_url") or "")
    if not url:
        return [], 0, "missing sam api url"
    params: dict[str, str] = {
        "api_key": api_key,
        "postedFrom": posted_from.strftime("%m/%d/%Y"),
        "postedTo": posted_to.strftime("%m/%d/%Y"),
        "limit": str(_SAM_PAGE_SIZE),
        "offset": str(max(0, offset)),
        "ncode": naics_code,
        # Server-side "response date in the future and not cancelled".
        "active": "Yes",
    }
    try:
        response = client.get(url, params=params)
    except Exception as exc:
        return [], 0, f"{type(exc).__name__}"
    if response.status_code == 401:
        return [], 0, "SAM unauthorized (check SAM_GOV_API_KEY)"
    if response.status_code == 403:
        return [], 0, "SAM forbidden"
    if response.status_code == 429:
        # Non-federal keys get 10 Opportunities requests/day; say when it resets.
        resets = ""
        try:
            resets = str((response.json() or {}).get("nextAccessTime") or "")
        except Exception:
            resets = response.headers.get("retry-after") or ""
        return [], 0, f"SAM daily quota exhausted{f' (resets {resets})' if resets else ''}"
    if response.status_code >= 400:
        return [], 0, f"HTTP{response.status_code}: {_error_detail(response)}"
    try:
        payload = response.json()
    except Exception:
        return [], 0, "invalid_json"
    raw = payload.get("opportunitiesData") if isinstance(payload, dict) else payload
    if isinstance(payload, dict) and raw is None:
        raw = payload.get("opportunities") or payload.get("data")
    if not isinstance(raw, list):
        return [], 0, "no opportunities list"
    total = 0
    if isinstance(payload, dict):
        try:
            total = int(payload.get("totalRecords") or 0)
        except (TypeError, ValueError):
            total = 0
    return [item for item in raw if isinstance(item, dict)], total, None


def _has_award_data(item: dict[str, Any]) -> bool:
    """True when the notice reports a contract that is already awarded.

    Justification and Approval notices carry the same `award` payload as an
    Award Notice but are typed "Justification", so matching the type string
    alone lets settled work through as though it were still biddable.
    """
    award = item.get("award")
    if not isinstance(award, dict):
        return False
    if _str_or_none(award.get("number")):
        return True
    return bool(_extract_awardee(item)[1])


def _notice_is_award(item: dict[str, Any]) -> bool:
    raw = str(
        item.get("type")
        or item.get("baseType")
        or item.get("noticeType")
        or item.get("ptype")
        or ""
    ).strip().lower()
    if raw in {"a", "award", "award notice"} or "award" in raw:
        return True
    return _has_award_data(item)


def _enrich_entity(
    client: httpx.Client, *, api_key: str, uei: str
) -> dict[str, str | None]:
    meta = COLLECTORS.get("sam_gov") or {}
    url = str(meta.get("entity_api_url") or "")
    if not url or not uei:
        return {}
    try:
        response = client.get(
            url,
            params={"api_key": api_key, "ueiSAM": uei, "includeSections": "entityRegistration"},
        )
    except Exception:
        return {}
    if response.status_code >= 400:
        return {}
    try:
        payload = response.json()
    except Exception:
        return {}
    entity_data = payload.get("entityData") if isinstance(payload, dict) else None
    if not isinstance(entity_data, list) or not entity_data:
        return {}
    row = entity_data[0] if isinstance(entity_data[0], dict) else {}
    registration = row.get("entityRegistration") if isinstance(row, dict) else None
    if not isinstance(registration, dict):
        registration = row if isinstance(row, dict) else {}
    return {
        "legal_name": _str_or_none(registration.get("legalBusinessName"))
        or _str_or_none(registration.get("legalName")),
        "cage_code": _str_or_none(registration.get("cageCode")),
        "registration_status": _str_or_none(registration.get("registrationStatus")),
    }


def fetch_sam_gov(source: dict[str, Any], client: httpx.Client) -> tuple[list[dict], str | None]:
    """Employment Services tenders + award vendors, scoped by NAICS code."""
    # Re-read .env so key/code updates apply without stale class defaults.
    from dotenv import load_dotenv
    from pathlib import Path
    import os

    load_dotenv(Path(__file__).resolve().parents[3] / ".env", override=True)
    api_key = (os.getenv("SAM_GOV_API_KEY") or settings.SAM_GOV_API_KEY or "").strip()
    if not api_key:
        return [], "SAM_GOV_API_KEY missing in .env"

    lookback = int(os.getenv("SAM_LOOKBACK_DAYS") or getattr(settings, "SAM_LOOKBACK_DAYS", 180) or 180)
    posted_from, posted_to = _posted_window(lookback)
    allowed = set(settings.sam_naics_code_list or NAICS_CATEGORIES)
    query_codes = settings.sam_naics_query_list
    max_rows = max(_SAM_PAGE_SIZE, int(settings.SAM_MAX_ROWS_PER_CODE or 2000))
    exclude_expired = bool(settings.SAM_EXCLUDE_EXPIRED)
    entity_budget = max(0, int(settings.SAM_ENTITY_LOOKUPS or 0))

    rows: list[dict] = []
    errors: list[str] = []
    for code in query_codes:
        offset = 0
        while offset < max_rows:
            page, total, err = _sam_search(
                client,
                api_key=api_key,
                naics_code=code,
                posted_from=posted_from,
                posted_to=posted_to,
                offset=offset,
            )
            if err:
                errors.append(f"NAICS {code}: {err}")
                break
            rows.extend(page)
            offset += _SAM_PAGE_SIZE
            if len(page) < _SAM_PAGE_SIZE or (total and offset >= total):
                break

    records: list[dict] = []
    seen_notices: set[str] = set()
    enriched_cache: dict[str, dict[str, str | None]] = {}
    dropped_naics = 0
    dropped_expired = 0
    dropped_awarded = 0

    for item in rows:
        title = _str_or_none(item.get("title"))
        if not title:
            continue
        naics = _extract_naics(item)
        # SAM can return a notice whose primary NAICS differs from the query.
        if naics not in allowed:
            dropped_naics += 1
            continue
        notice_id = _str_or_none(item.get("noticeId")) or title
        if notice_id in seen_notices:
            continue
        seen_notices.add(notice_id)
        category = category_for_naics(naics)
        is_award = _notice_is_award(item)
        if exclude_expired and not is_award and _deadline_passed(item):
            dropped_expired += 1
            continue
        agency = _extract_agency(item)
        ui = _str_or_none(item.get("uiLink"))
        if not ui and notice_id:
            ui = f"https://sam.gov/opp/{quote(notice_id)}/view"
        place = item.get("placeOfPerformance")
        location = "United States"
        if isinstance(place, dict):
            city = place.get("city") if isinstance(place.get("city"), dict) else {}
            state = place.get("state") if isinstance(place.get("state"), dict) else {}
            location = (
                _str_or_none((city or {}).get("name"))
                or _str_or_none((state or {}).get("name"))
                or _str_or_none((state or {}).get("code"))
                or "United States"
            )
        elif isinstance(place, str) and place.strip():
            location = place.strip()
        notice_type = _str_or_none(item.get("type") or item.get("baseType")) or "Notice"

        if is_award:
            vendor_name, uei = _extract_awardee(item)
            if not vendor_name:
                # Settled work either way, so it must not become an
                # opportunity — but count it so the run explains itself
                # instead of quietly shrinking the result.
                dropped_awarded += 1
                continue
            entity: dict[str, str | None] = {}
            if uei and uei in enriched_cache:
                entity = enriched_cache[uei] or {}
            elif uei and len(enriched_cache) < entity_budget:
                entity = _enrich_entity(client, api_key=api_key, uei=uei)
                enriched_cache[uei] = entity
            legal = entity.get("legal_name") if entity else None
            records.append(
                {
                    "record_kind": "vendor",
                    "external_job_id": notice_id,
                    "title": title[:512],
                    "vendor_name": (legal or vendor_name)[:255],
                    "vendor_uei": uei,
                    "cage_code": entity.get("cage_code") if entity else None,
                    "registration_status": entity.get("registration_status") if entity else None,
                    "agency_name": agency,
                    "board_token": _agency_token(agency),
                    "board_name": agency,
                    "url": ui,
                    "posted_at": _str_or_none(item.get("postedDate"))
                    or _str_or_none(item.get("awardDate")),
                    "naics": naics,
                    "category": category,
                    "heat": HEAT_VERY_HOT,
                    "signal_type": SIGNAL_CONTRACT_AWARD,
                    "award_title": title[:512],
                }
            )
            continue

        records.append(
            {
                "record_kind": "tender",
                "external_job_id": notice_id,
                "title": title[:512],
                "location": location,
                "department": f"SAM / {notice_type}"
                + (f" / NAICS {naics}" if naics else ""),
                "category": category,
                "url": ui,
                "posted_at": _str_or_none(item.get("postedDate")),
                # End dates only. postedDate was rejected as a fallback because
                # it is a start date, which made notices with no deadline look
                # like they closed the day they opened. archiveDate is a real
                # end date, so it stands in when there is no response deadline.
                "updated_at": _effective_deadline(item),
                "requisition_id": _str_or_none(item.get("solicitationNumber")),
                "board_token": _agency_token(agency),
                "board_name": agency,
                "heat": HEAT_VERY_HOT,
                "signal_type": SIGNAL_GOVERNMENT_STAFFING,
                "naics": naics,
                "agency_name": agency,
                # Plan A: facts/contact/attachments from this same search row.
                "detail": _build_tender_detail(
                    item, notice_type=notice_type, naics=naics, category=category
                ),
            }
        )

    summary: list[str] = []
    if dropped_naics:
        summary.append(f"{dropped_naics} outside tracked NAICS")
    if dropped_expired:
        summary.append(f"{dropped_expired} past response or inactive date")
    if dropped_awarded:
        summary.append(f"{dropped_awarded} already awarded without a named contractor")
    summary.extend(errors[:2])

    # An empty result must still explain itself: "SAM sent nothing" and
    # "SAM sent rows we dropped" need different fixes.
    if not records:
        detail = f"SAM returned {len(rows)} row(s) for ncode {','.join(query_codes)}"
        if summary:
            detail += " — " + ", ".join(summary)
        return [], detail

    if summary:
        for record in records:
            if record.get("record_kind") != "vendor":
                record["collector_warning"] = "filtered " + ", ".join(summary)
                break

    return records, None


FETCHERS: dict[str, Callable[[dict[str, Any], httpx.Client], tuple[list[dict], str | None]]] = {
    "greenhouse": fetch_greenhouse,
    "lever": fetch_lever,
    "ashby": fetch_ashby,
    "sam_gov": fetch_sam_gov,
}


def fetch_source(source: dict[str, Any], client: httpx.Client) -> tuple[list[dict], str | None]:
    collector_key = str(source.get("collector") or "")
    collector = COLLECTORS.get(collector_key)
    if not collector or not collector.get("enabled"):
        return [], f"collector disabled or missing: {collector_key}"
    fetcher = FETCHERS.get(collector_key)
    if not fetcher:
        return [], f"unsupported collector {collector_key}"
    return fetcher(source, client)
