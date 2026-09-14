from fastapi import Depends, Query
from pydantic import BaseModel, Field

from app.api.deps import bearer_token, require_customer
from app.services import account_service, auth_service


class LoginBody(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=1)


def login(body: LoginBody):
    return auth_service.login_admin(body.email, body.password)


def me(token: str = Depends(bearer_token)):
    return auth_service.current_admin(token)


class SetPasswordBody(BaseModel):
    token: str = Field(min_length=8)
    password: str = Field(min_length=8)


class EmailBody(BaseModel):
    email: str = Field(min_length=3)


def customer_login(body: LoginBody):
    return account_service.login_customer(body.email, body.password)


def set_password(body: SetPasswordBody):
    return account_service.set_password(token=body.token, password=body.password)


def resend_setup(body: EmailBody):
    return account_service.resend_password_setup(body.email)


def provisioning_status(email: str = Query(min_length=3)):
    return account_service.provisioning_status(email=email)


def customer_me(customer: dict = Depends(require_customer)):
    return customer


class UpdateProfileBody(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    phone: str = Field(default="", max_length=40)


def update_customer_profile(body: UpdateProfileBody, customer: dict = Depends(require_customer)):
    return auth_service.update_customer_profile(
        actor=customer,
        name=body.name,
        phone=body.phone,
    )
