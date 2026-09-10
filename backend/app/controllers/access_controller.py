from pydantic import BaseModel, Field

from app.services import access_service


class AccessRequestBody(BaseModel):
    name: str = Field(min_length=1)
    email: str = Field(min_length=3)
    phone: str = Field(min_length=1)
    company: str = ""


def create_access_request(body: AccessRequestBody):
    return access_service.create_access_request(
        name=body.name,
        email=body.email,
        phone=body.phone,
        company=body.company,
    )
