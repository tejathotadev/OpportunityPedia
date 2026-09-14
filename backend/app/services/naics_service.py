from __future__ import annotations

from collections import defaultdict

from fastapi import HTTPException, status

from app.core.config import settings
from app.repositories import naics_repository, user_repository


def ensure_catalog() -> None:
    naics_repository.seed_catalog()


def catalog_tree() -> dict:
    """Global catalog for admin — sectors → groups → codes. Expandable later."""
    ensure_catalog()
    rows = naics_repository.list_catalog(active_only=True)
    sectors: dict[str, dict] = {}
    for row in rows:
        sector_code = str(row["sector_code"])
        group_code = str(row["group_code"])
        sector = sectors.setdefault(
            sector_code,
            {
                "sector_code": sector_code,
                "sector_title": row["sector_title"],
                "code_count": 0,
                "groups": {},
            },
        )
        group = sector["groups"].setdefault(
            group_code,
            {
                "group_code": group_code,
                "group_title": row["group_title"],
                "codes": [],
            },
        )
        group["codes"].append({"code": row["code"], "title": row["title"]})
        sector["code_count"] += 1

    sector_list = []
    for sector in sectors.values():
        sector_list.append(
            {
                "sector_code": sector["sector_code"],
                "sector_title": sector["sector_title"],
                "code_count": sector["code_count"],
                "groups": list(sector["groups"].values()),
            }
        )
    sector_list.sort(key=lambda s: s["sector_code"])
    return {"sectors": sector_list}


def get_user_coverage(user_id: int) -> dict:
    ensure_catalog()
    user = user_repository.find_by_id(user_id)
    if not user or user.get("role") != "customer":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    details = naics_repository.list_user_code_details(user_id)
    codes = [str(row["code"]) for row in details]
    by_sector: dict[str, int] = defaultdict(int)
    for row in details:
        by_sector[str(row["sector_code"])] += 1
    return {
        "user_id": user_id,
        "codes": codes,
        "details": [
            {
                "code": row["code"],
                "title": row["title"],
                "sector_code": row["sector_code"],
                "sector_title": row["sector_title"],
                "group_code": row["group_code"],
                "group_title": row["group_title"],
            }
            for row in details
        ],
        "sector_counts": dict(by_sector),
        "count": len(codes),
    }


def set_user_coverage(
    *,
    user_id: int,
    codes: list[str] | None = None,
    sector_code: str | None = None,
    group_code: str | None = None,
) -> dict:
    """Replace user coverage from explicit codes, a whole sector, or a group."""
    ensure_catalog()
    user = user_repository.find_by_id(user_id)
    if not user or user.get("role") != "customer":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    resolved: list[str]
    if sector_code:
        resolved = naics_repository.list_codes_for_sector(sector_code)
        if not resolved:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No active codes for sector {sector_code}",
            )
    elif group_code:
        resolved = naics_repository.list_codes_for_group(group_code)
        if not resolved:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No active codes for group {group_code}",
            )
    elif codes is not None:
        resolved = naics_repository.filter_known_codes(codes)
        if codes and not resolved:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="None of the provided NAICS codes exist in the catalog",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide codes, sector_code, or group_code",
        )

    naics_repository.replace_user_codes(user_id, resolved)
    return get_user_coverage(user_id)


def assign_defaults_if_empty(user_id: int) -> None:
    ensure_catalog()
    if not naics_repository.list_user_codes(user_id):
        naics_repository.assign_default_user_codes(user_id)


def resolve_query_codes_for_user(user_id: int) -> list[str]:
    """Codes Radar should query for this workspace."""
    from app.data.naics_sector_56 import DEFAULT_USER_NAICS_CODES

    ensure_catalog()
    codes = naics_repository.list_user_codes(user_id)
    if codes:
        return codes
    # Fallback for older workspaces before coverage was assigned.
    env_codes = settings.sam_naics_query_list or settings.sam_naics_code_list
    if env_codes:
        return list(env_codes)
    return list(DEFAULT_USER_NAICS_CODES)
