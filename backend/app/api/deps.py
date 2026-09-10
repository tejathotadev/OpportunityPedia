from fastapi import Depends, Header, HTTPException, status

from app.core.config import settings
from app.services import auth_service


def bearer_token(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    return authorization.split(" ", 1)[1].strip()


def require_admin(token: str = Depends(bearer_token)) -> dict:
    return auth_service.current_admin(token)


def require_customer(token: str = Depends(bearer_token)) -> dict:
    return auth_service.current_customer(token)


def current_user_id(authorization: str | None = Header(default=None)) -> int:
    """Customer id for the OP read API.

    OP has no sign-in screen yet, so `OP_PUBLIC_USER_ID` lets a local dev build
    read one account's radar data without a token. Leave it at 0 anywhere the
    API is reachable off localhost.
    """
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        return int(auth_service.current_customer(token)["id"])
    if settings.OP_PUBLIC_USER_ID:
        return int(settings.OP_PUBLIC_USER_ID)
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
