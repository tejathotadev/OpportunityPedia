"""AI outreach draft + admin Gemini test endpoints."""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.deps import current_actor_id, current_user_id, require_admin, require_customer
from app.core.config import settings
from app.repositories import user_repository
from app.services import gemini_service, op_service


class AiDraftBody(BaseModel):
    opportunity_id: str = Field(min_length=1, max_length=200)
    style_hint: str | None = Field(default=None, max_length=80)


def generate_outreach_ai_draft(
    body: AiDraftBody,
    user_id: int = Depends(current_user_id),
    actor_id: int = Depends(current_actor_id),
    _customer: dict = Depends(require_customer),
):
    opportunity = op_service.get_opportunity(
        user_id=user_id, opportunity_id=body.opportunity_id
    )
    if not opportunity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found"
        )

    actor = user_repository.find_by_id(actor_id) or {}
    sender = {
        "name": actor.get("name") or "",
        "email": actor.get("email") or "",
        "company": actor.get("company") or "",
        "phone": actor.get("phone") or "",
    }
    draft = gemini_service.generate_outreach_draft(
        opportunity=opportunity,
        sender=sender,
        style_hint=body.style_hint,
    )
    return {
        "subject": draft["subject"],
        "body": draft["body"],
        "model": settings.GEMINI_MODEL,
    }


def admin_test_gemini(_admin: dict = Depends(require_admin)):
    return gemini_service.test_connection()
