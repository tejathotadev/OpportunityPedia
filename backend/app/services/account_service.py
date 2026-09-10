from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.repositories import token_repository, user_repository
from app.services import email_service


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def issue_password_setup(user_id: int, *, reason: str = "payment") -> dict:
    user = user_repository.find_by_id(user_id)
    if not user or user.get("role") != "customer":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user")
    raw = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=24)
    token_repository.expire_open_for_user(user_id)
    token_repository.insert(user_id=user_id, token_hash=_hash_token(raw), expires_at=expires)
    setup_url = f"{settings.FRONTEND_PUBLIC_URL}/set-password?token={raw}"
    emailed = False
    try:
        emailed = email_service.send_password_setup(
            to_email=user["email"],
            name=user["name"],
            setup_url=setup_url,
            reason=reason,
        )
    except Exception:
        emailed = False
    return {
        "email": user["email"],
        "email_sent": emailed,
        # Always return URL when email failed so admin can share the link manually.
        "setup_url": None if emailed else setup_url,
    }


def resend_password_setup(email: str) -> dict:
    user = user_repository.find_by_email(email)
    if not user or user.get("role") != "customer":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No account for this email")
    if user.get("status") not in {"paid", "active"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is not active")
    reason = "invite" if not user.get("password_hash") else "payment"
    return issue_password_setup(int(user["id"]), reason=reason)


def set_password(*, token: str, password: str) -> dict:
    if len(password) < 8:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 8 characters")
    row = token_repository.find_valid(_hash_token(token.strip()))
    if not row:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Link is invalid or expired")
    user_repository.set_password_hash(int(row["user_id"]), hash_password(password))
    token_repository.mark_used(int(row["id"]))
    user = user_repository.find_by_id(int(row["user_id"]))
    assert user is not None
    return {"email": user["email"], "status": "active"}


def login_customer(email: str, password: str) -> dict:
    user = user_repository.find_by_email(email)
    if not user or user.get("role") != "customer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.get("password_hash"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Create your password from the email link first",
        )
    if not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if user.get("status") not in {"paid", "active"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is not active")
    user_repository.touch_last_login(int(user["id"]))
    token = create_access_token(
        user_id=int(user["id"]),
        email=user["email"],
        role=user["role"],
    )
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "status": user["status"],
            "is_demo": bool(user.get("is_demo")),
        },
    }
