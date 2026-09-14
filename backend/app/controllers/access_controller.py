from pydantic import BaseModel, Field

from app.services import access_service


class AccessRequestBody(BaseModel):
    name: str = Field(min_length=1)
    email: str = Field(min_length=3)
    phone: str = Field(min_length=1)
    company: str = ""


class FreeSignupBody(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=3, max_length=200)
    phone: str = Field(min_length=5, max_length=40)
    company: str = Field(min_length=2, max_length=120)


def create_access_request(body: AccessRequestBody):
    return access_service.create_access_request(
        name=body.name,
        email=body.email,
        phone=body.phone,
        company=body.company,
    )


def signup_free(body: FreeSignupBody):
    return access_service.signup_free_plan(
        name=body.name,
        email=body.email,
        phone=body.phone,
        company=body.company,
    )
