from fastapi import Depends
from pydantic import BaseModel, Field

from app.api.deps import bearer_token
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
