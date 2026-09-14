from fastapi import Depends
from pydantic import BaseModel, EmailStr, Field

from app.api.deps import require_admin
from app.core.provisioning import ALLOWED_PLANS, PLAN_FREE
from app.services import access_service, lead_service, naics_service, radar_service


class UpdateLeadBody(BaseModel):
    status: str = Field(min_length=2, max_length=32)
    admin_notes: str | None = Field(default=None, max_length=4000)


class CreateUserBody(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    company: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=40)
    plan: str = Field(default=PLAN_FREE, max_length=32)


class SetPlanBody(BaseModel):
    plan: str = Field(min_length=3, max_length=32)


class ActivateUserBody(BaseModel):
    """Finish workspace setup: optional key + NAICS in one step."""

    gov_api_key: str | None = Field(default=None, max_length=512)
    naics_codes: list[str] | None = None
    naics_sector_code: str | None = Field(default=None, max_length=8)
    naics_group_code: str | None = Field(default=None, max_length=8)


class SetUserNaicsBody(BaseModel):
    """Assign coverage: explicit codes, whole sector, or one group."""

    codes: list[str] | None = None
    sector_code: str | None = Field(default=None, max_length=8)
    group_code: str | None = Field(default=None, max_length=8)


def list_users(_admin: dict = Depends(require_admin)):
    return {"users": access_service.list_customers()}


def create_user(body: CreateUserBody, _admin: dict = Depends(require_admin)):
    plan = (body.plan or PLAN_FREE).strip().lower()
    if plan not in ALLOWED_PLANS:
        plan = PLAN_FREE
    return access_service.create_customer_by_admin(
        name=body.name,
        email=str(body.email),
        company=body.company,
        phone=body.phone,
        plan=plan,
    )


def set_user_plan(
    user_id: int,
    body: SetPlanBody,
    _admin: dict = Depends(require_admin),
):
    return access_service.set_plan(user_id=user_id, plan=body.plan)


def remove_user(user_id: int, _admin: dict = Depends(require_admin)):
    return access_service.remove_customer(user_id=user_id)


def restore_user(user_id: int, _admin: dict = Depends(require_admin)):
    return access_service.restore_customer(user_id=user_id)


def activate_user(
    user_id: int,
    body: ActivateUserBody,
    _admin: dict = Depends(require_admin),
):
    return access_service.activate_customer(
        user_id=user_id,
        gov_api_key=body.gov_api_key,
        naics_codes=body.naics_codes,
        naics_sector_code=body.naics_sector_code,
        naics_group_code=body.naics_group_code,
    )


def list_naics_catalog(_admin: dict = Depends(require_admin)):
    return naics_service.catalog_tree()


def get_user_naics(user_id: int, _admin: dict = Depends(require_admin)):
    return naics_service.get_user_coverage(user_id)


def set_user_naics(
    user_id: int,
    body: SetUserNaicsBody,
    _admin: dict = Depends(require_admin),
):
    return naics_service.set_user_coverage(
        user_id=user_id,
        codes=body.codes,
        sector_code=body.sector_code,
        group_code=body.group_code,
    )


def list_user_radar_runs(user_id: int, _admin: dict = Depends(require_admin)):
    return radar_service.list_radar_runs(user_id=user_id)


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
