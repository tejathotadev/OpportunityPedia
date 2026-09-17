from __future__ import annotations

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.provisioning import (
    LOGIN_READY_STATUSES,
    PASSWORD_SETUP_STATUSES,
    STATUS_PENDING_PASSWORD,
    STATUS_PROVISIONING,
    STATUS_REMOVED,
    TRIAL_ENDED_DETAIL,
    post_password_next,
    post_password_status,
    trial_is_expired,
)
from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.repositories import token_repository, user_repository
from app.services import email_service

logger = logging.getLogger(__name__)


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def issue_password_setup(user_id: int, *, reason: str = "payment") -> dict:
    user = user_repository.find_by_id(user_id)
    if not user or user.get("role") != "customer":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user")
    raw = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=24)
    token_repository.rotate_open_token(
        user_id=user_id,
        token_hash=_hash_token(raw),
        expires_at=expires,
    )
    setup_url = f"{settings.FRONTEND_PUBLIC_URL}/set-password?token={raw}"
    emailed, email_error = email_service.send_password_setup(
        to_email=user["email"],
        name=user["name"],
        setup_url=setup_url,
        reason=reason,
    )
    if not emailed:
        logger.warning(
            "password-setup email not delivered to %s: %s",
            user["email"],
            email_error or "unknown",
        )
    return {
        "email": user["email"],
        "email_sent": emailed,
        "email_error": email_error,
        # Always return URL when email failed so admin can share the link manually.
        "setup_url": None if emailed else setup_url,
    }


def resend_password_setup(email: str) -> dict:
    user = user_repository.find_by_email(email)
    if not user or user.get("role") != "customer":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No account for this email")
    if user.get("status") not in PASSWORD_SETUP_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account cannot receive a setup link in its current state",
        )
    reason = "invite" if not user.get("password_hash") else "payment"
    return issue_password_setup(int(user["id"]), reason=reason)


def set_password(*, token: str, password: str) -> dict:
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters",
        )
    row = token_repository.find_valid(_hash_token(token.strip()))
    if not row:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Link is invalid or expired",
        )
    user = user_repository.find_by_id(int(row["user_id"]))
    if not user or user.get("role") != "customer":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user")

    plan = user.get("plan")
    seat_role = user.get("seat_role")
    next_status = post_password_status(plan=plan, seat_role=seat_role)
    user_repository.set_password_and_consume_token(
        user_id=int(row["user_id"]),
        password_hash=hash_password(password),
        status=next_status,
        token_id=int(row["id"]),
    )
    refreshed = user_repository.find_by_id(int(row["user_id"]))
    assert refreshed is not None
    return {
        "email": refreshed["email"],
        "status": next_status,
        "plan": refreshed.get("plan") or "free",
        "next": post_password_next(plan=plan, seat_role=seat_role),
        "seat_role": (refreshed.get("seat_role") or "owner"),
    }


def provisioning_status(*, email: str) -> dict:
    """Public poll for the workspace wait page (no secrets returned)."""
    user = user_repository.find_by_email(email.strip().lower())
    if not user or user.get("role") != "customer":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    status_value = str(user.get("status") or "")
    ready = status_value in LOGIN_READY_STATUSES
    return {
        "email": user["email"],
        "status": status_value,
        "plan": user.get("plan") or "free",
        "ready": ready,
        "message": (
            "Your workspace is ready. You can sign in."
            if ready
            else "We are setting up your workspace. This usually takes about 10 minutes."
        ),
    }


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

    status_value = str(user.get("status") or "")
    if status_value == STATUS_REMOVED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been removed. Contact support if that was a mistake.",
        )
    if status_value == STATUS_PROVISIONING:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your workspace is still being set up. Please wait a few minutes.",
        )
    if status_value == STATUS_PENDING_PASSWORD or status_value == "pending":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Create your password from the email link first",
        )
    if status_value not in LOGIN_READY_STATUSES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is not active")

    workspace_id = user_repository.resolve_workspace_id(user) or int(user["id"])
    # Members need an active owner workspace.
    owner = user
    if workspace_id != int(user["id"]):
        owner = user_repository.find_by_id(workspace_id) or user
        if not owner or str(owner.get("status") or "") == STATUS_REMOVED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This workspace is no longer available",
            )
        if str(owner.get("status") or "") not in LOGIN_READY_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Workspace is not active yet",
            )

    if trial_is_expired(owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=TRIAL_ENDED_DETAIL,
        )

    session_version = user_repository.bump_session_version(int(user["id"]))
    token = create_access_token(
        user_id=int(user["id"]),
        email=user["email"],
        role=user["role"],
        session_version=session_version,
    )
    from app.services.auth_service import _public_user

    refreshed = user_repository.find_by_id(int(user["id"])) or user
    return {
        "token": token,
        "user": _public_user(refreshed, owner_id=workspace_id),
    }
