from fastapi import Depends
from pydantic import BaseModel, EmailStr, Field

from app.api.deps import require_customer
from app.services import workspace_service


class InviteMemberBody(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=40)


def list_team(customer: dict = Depends(require_customer)):
    return workspace_service.list_team(actor=customer)


def invite_member(body: InviteMemberBody, customer: dict = Depends(require_customer)):
    return workspace_service.invite_member(
        actor=customer,
        name=body.name,
        email=str(body.email),
        phone=body.phone,
    )


def remove_member(member_id: int, customer: dict = Depends(require_customer)):
    return workspace_service.remove_member(actor=customer, member_id=member_id)
