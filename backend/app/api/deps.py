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
    """Authenticated customer actor (includes workspace_id + seat_role)."""
    return auth_service.current_customer(token)


def current_user_id(authorization: str | None = Header(default=None)) -> int:
    """Workspace owner id for OP/Radar data scoping.

    Teammates authenticate as themselves but read/write workspace data under
    the owner's id. Leave `OP_PUBLIC_USER_ID` at 0 off localhost.
    """
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        customer = auth_service.current_customer(token)
        return int(customer.get("workspace_id") or customer["id"])
    if settings.OP_PUBLIC_USER_ID:
        return int(settings.OP_PUBLIC_USER_ID)
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")


def current_actor_id(authorization: str | None = Header(default=None)) -> int:
    """Logged-in person's user id (owner or teammate), for assign-to-me etc."""
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        return int(auth_service.current_customer(token)["id"])
    if settings.OP_PUBLIC_USER_ID:
        return int(settings.OP_PUBLIC_USER_ID)
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
