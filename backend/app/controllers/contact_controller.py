from pydantic import BaseModel, EmailStr, Field

from app.services import lead_service


class ContactBody(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    company: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=40)
    job_title: str | None = Field(default=None, max_length=120)
    reason: str = Field(min_length=1, max_length=80)
    message: str = Field(min_length=20, max_length=2000)


def submit_contact(body: ContactBody):
    return lead_service.submit_contact(
        name=body.name,
        email=str(body.email),
        company=body.company,
        phone=body.phone,
        job_title=body.job_title,
        reason=body.reason,
        message=body.message,
    )
