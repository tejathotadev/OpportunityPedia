from fastapi import Depends
from pydantic import BaseModel, EmailStr, Field

from app.api.deps import require_admin
from app.services import access_service, lead_service


class UpdateLeadBody(BaseModel):
    status: str = Field(min_length=2, max_length=32)
    admin_notes: str | None = Field(default=None, max_length=4000)


class CreateUserBody(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    company: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=40)


def list_users(_admin: dict = Depends(require_admin)):
    return {"users": access_service.list_customers()}


def create_user(body: CreateUserBody, _admin: dict = Depends(require_admin)):
    return access_service.create_customer_by_admin(
        name=body.name,
        email=str(body.email),
        company=body.company,
        phone=body.phone,
    )


def list_payments(_admin: dict = Depends(require_admin)):
    return {"payments": access_service.list_payments()}


def list_leads(_admin: dict = Depends(require_admin)):
    return {"leads": lead_service.list_leads()}


def update_lead(lead_id: int, body: UpdateLeadBody, admin: dict = Depends(require_admin)):
    return lead_service.update_lead(
        lead_id=lead_id,
        status=body.status,
        admin_notes=body.admin_notes,
        assigned_admin_id=int(admin["id"]),
    )
