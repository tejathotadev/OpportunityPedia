from __future__ import annotations

from fastapi import HTTPException, status
from jwt import InvalidTokenError

from app.core.provisioning import (
    LOGIN_READY_STATUSES,
    PLAN_FREE,
    SEAT_ROLE_OWNER,
    STATUS_REMOVED,
    TRIAL_ENDED_DETAIL,
    trial_is_expired,
)
from app.core.security import (
    ROLE_PLATFORM_ADMIN,
    SIGNED_IN_ELSEWHERE,
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
    session_version = user_repository.bump_session_version(int(user["id"]))
    token = create_access_token(
        user_id=int(user["id"]),
        email=user["email"],
        role=user["role"],
        session_version=session_version,
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
    _assert_session_version(payload, user)
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
    if user.get("status") == STATUS_REMOVED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been removed",
        )
    if user.get("status") not in LOGIN_READY_STATUSES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is not active")

    _assert_session_version(payload, user)

    # Members inherit login readiness from an active owner workspace.
    workspace_id = user_repository.resolve_workspace_id(user) or int(user["id"])
    owner = user
    if workspace_id != int(user["id"]):
        owner = user_repository.find_by_id(workspace_id) or user
        if not owner or owner.get("status") == STATUS_REMOVED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This workspace is no longer available",
            )
        if owner.get("status") not in LOGIN_READY_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Workspace is not active yet",
            )

    if trial_is_expired(owner):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=TRIAL_ENDED_DETAIL,
        )

    return _public_user(user, owner_id=workspace_id)


def _assert_session_version(payload: dict, user: dict) -> None:
    """One active device: JWT sv must match users.session_version."""
    db_sv = int(user.get("session_version") or 1)
    token_sv = payload.get("sv")
    if token_sv is None:
        # Tokens issued before this feature stay valid until the next login bumps sv.
        if db_sv > 1:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=SIGNED_IN_ELSEWHERE,
            )
        return
    if int(token_sv) != db_sv:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=SIGNED_IN_ELSEWHERE,
        )


def _public_user(user: dict, *, owner_id: int | None = None) -> dict:
    workspace_id = owner_id
    if workspace_id is None:
        workspace_id = user_repository.resolve_workspace_id(user) or int(user["id"])
    seat_role = (user.get("seat_role") or SEAT_ROLE_OWNER).strip().lower()
    plan = user.get("plan") or PLAN_FREE
    if seat_role != SEAT_ROLE_OWNER and workspace_id != int(user["id"]):
        owner = user_repository.find_by_id(int(workspace_id))
        if owner:
            plan = owner.get("plan") or plan
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "status": user["status"],
        "plan": plan,
        "workspace_id": int(workspace_id),
        "seat_role": seat_role,
        "company": user.get("company"),
        "phone": user.get("phone"),
        "is_demo": bool(user.get("is_demo")),
    }


def update_customer_profile(*, actor: dict, name: str, phone: str) -> dict:
    user_id = int(actor["id"])
    row = user_repository.find_by_id(user_id)
    if not row or row.get("role") != "customer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user_repository.update_customer_profile(
        user_id=user_id,
        name=name.strip(),
        phone=phone.strip(),
        company=row.get("company"),
    )
    refreshed = user_repository.find_by_id(user_id) or row
    workspace_id = user_repository.resolve_workspace_id(refreshed) or user_id
    return _public_user(refreshed, owner_id=workspace_id)
