from __future__ import annotations

from fastapi import HTTPException, status
from jwt import InvalidTokenError

from app.core.security import (
    ROLE_PLATFORM_ADMIN,
    create_access_token,
    decode_access_token,
    verify_password,
)
from app.repositories import user_repository


def login_admin(email: str, password: str) -> dict:
    user = user_repository.find_by_email(email)
    if not user or user.get("role") != ROLE_PLATFORM_ADMIN:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not verify_password(password, user.get("password_hash") or ""):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if user.get("status") != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin is not active")
    user_repository.touch_last_login(int(user["id"]))
    token = create_access_token(
        user_id=int(user["id"]),
        email=user["email"],
        role=user["role"],
    )
    return {"token": token, "user": _public_user(user)}


def current_admin(token: str) -> dict:
    try:
        payload = decode_access_token(token)
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        ) from exc
    user_id = int(payload.get("sub", "0"))
    user = user_repository.find_by_id(user_id)
    if not user or user.get("role") != ROLE_PLATFORM_ADMIN:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return _public_user(user)


def current_customer(token: str) -> dict:
    try:
        payload = decode_access_token(token)
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        ) from exc
    user_id = int(payload.get("sub", "0"))
    user = user_repository.find_by_id(user_id)
    if not user or user.get("role") != "customer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    if user.get("status") not in {"paid", "active"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is not active")
    return _public_user(user)


def _public_user(user: dict) -> dict:
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "status": user["status"],
    }
