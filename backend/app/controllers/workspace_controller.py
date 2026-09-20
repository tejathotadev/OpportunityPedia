from fastapi import Depends
from pydantic import BaseModel, EmailStr, Field

from app.api.deps import require_customer
from app.services import workspace_service


class InviteMemberBody(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=40)


class SmtpSettingsBody(BaseModel):
    host: str = Field(min_length=1, max_length=255)
    port: int = Field(default=587, ge=1, le=65535)
    username: str = Field(min_length=1, max_length=255)
    password: str | None = Field(default=None, max_length=512)
    from_email: EmailStr
    from_name: str | None = Field(default=None, max_length=120)
    use_ssl: bool = False
    enabled: bool = True


class SmtpTestBody(BaseModel):
    to_email: EmailStr | None = None
    host: str | None = Field(default=None, max_length=255)
    port: int | None = Field(default=None, ge=1, le=65535)
    username: str | None = Field(default=None, max_length=255)
    password: str | None = Field(default=None, max_length=512)
    from_email: EmailStr | None = None
    from_name: str | None = Field(default=None, max_length=120)
    use_ssl: bool | None = None


def list_team(customer: dict = Depends(require_customer)):
    return workspace_service.list_team(actor=customer)


def get_plan(customer: dict = Depends(require_customer)):
    return workspace_service.get_plan_summary(actor=customer)


def invite_member(body: InviteMemberBody, customer: dict = Depends(require_customer)):
    return workspace_service.invite_member(
        actor=customer,
        name=body.name,
        email=str(body.email),
        phone=body.phone,
    )


def remove_member(member_id: int, customer: dict = Depends(require_customer)):
    return workspace_service.remove_member(actor=customer, member_id=member_id)


def get_smtp(customer: dict = Depends(require_customer)):
    return workspace_service.get_smtp_settings(actor=customer)


def put_smtp(body: SmtpSettingsBody, customer: dict = Depends(require_customer)):
    return workspace_service.upsert_smtp_settings(
        actor=customer,
        body={
            "host": body.host,
            "port": body.port,
            "username": body.username,
            "password": body.password,
            "from_email": str(body.from_email),
            "from_name": body.from_name,
            "use_ssl": body.use_ssl,
            "enabled": body.enabled,
        },
    )


def delete_smtp(customer: dict = Depends(require_customer)):
    return workspace_service.clear_smtp_settings(actor=customer)


def test_smtp(body: SmtpTestBody = SmtpTestBody(), customer: dict = Depends(require_customer)):
    payload = body.model_dump(exclude_none=True)
    return workspace_service.test_smtp_settings(actor=customer, body=payload)
