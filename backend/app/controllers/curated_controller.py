"""Admin CRUD for curated (manually shared) opportunities."""

from __future__ import annotations

from typing import Any

from fastapi import Depends
from pydantic import BaseModel, Field

from app.api.deps import require_admin
from app.services import curated_opportunity_service


class CuratedOpportunityBody(BaseModel):
    category: str = Field(min_length=3, max_length=32)
    opportunity_type: str = Field(min_length=2, max_length=64)
    company: str | None = Field(default=None, max_length=200)
    title: str = Field(min_length=3, max_length=300)
    location: str | None = Field(default=None, max_length=200)
    engagement: str | None = Field(default=None, max_length=80)
    duration: str | None = Field(default=None, max_length=80)
    openings: int | None = Field(default=None, ge=1, le=10000)
    experience: str | None = Field(default=None, max_length=120)
    skills: list[str] | None = None
    technologies: list[str] | None = None
    vendor_looking_for: str | None = Field(default=None, max_length=4000)
    partnership_model: str | None = Field(default=None, max_length=120)
    client_industry: str | None = Field(default=None, max_length=120)
    candidate_requirement: str | None = Field(default=None, max_length=2000)
    contact_name: str | None = Field(default=None, max_length=160)
    contact_email: str | None = Field(default=None, max_length=200)
    priority: str = Field(default="hot", max_length=32)
    description: str | None = Field(default=None, max_length=20000)
    detected_at: str | None = Field(default=None, max_length=64)
    visible_to_user_ids: list[int] = Field(default_factory=list)
    payload: dict[str, Any] | None = None


class SetVisibilityBody(BaseModel):
    visible_to_user_ids: list[int] = Field(default_factory=list)


def list_curated_opportunities(
    include_archived: bool = False,
    _admin: dict = Depends(require_admin),
):
    return {
        "items": curated_opportunity_service.list_admin(include_archived=include_archived)
    }


def get_curated_opportunity(opportunity_id: str, _admin: dict = Depends(require_admin)):
    return curated_opportunity_service.get_admin(opportunity_id)


def create_curated_opportunity(
    body: CuratedOpportunityBody,
    admin: dict = Depends(require_admin),
):
    return curated_opportunity_service.create_admin(
        body=body.model_dump(),
        created_by=int(admin["id"]),
    )


def update_curated_opportunity(
    opportunity_id: str,
    body: CuratedOpportunityBody,
    _admin: dict = Depends(require_admin),
):
    return curated_opportunity_service.update_admin(
        opportunity_id=opportunity_id,
        body=body.model_dump(),
    )


def set_curated_visibility(
    opportunity_id: str,
    body: SetVisibilityBody,
    _admin: dict = Depends(require_admin),
):
    return curated_opportunity_service.set_visibility_admin(
        opportunity_id=opportunity_id,
        workspace_ids=body.visible_to_user_ids,
    )


def archive_curated_opportunity(
    opportunity_id: str,
    _admin: dict = Depends(require_admin),
):
    return curated_opportunity_service.archive_admin(opportunity_id)
