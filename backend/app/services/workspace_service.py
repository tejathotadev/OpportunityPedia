"""Workspace team seats — invite/list/remove under an owner's plan limit."""

from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.provisioning import (
    PLAN_FREE,
    PLAN_PAID,
    SEAT_ROLE_MEMBER,
    SEAT_ROLE_OWNER,
    STATUS_ACTIVE,
    STATUS_REMOVED,
    TRIAL_DAYS,
    free_trial_applies,
    seat_limit_for_plan,
    trial_is_expired,
    trial_seconds_remaining,
)
from app.repositories import user_repository


def _iso(value: object) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat(sep=" ", timespec="seconds")
    return str(value)


def _member_public(row: dict) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "phone": row.get("phone"),
        "company": row.get("company"),
        "status": row["status"],
        "seat_role": (row.get("seat_role") or SEAT_ROLE_OWNER).strip().lower(),
        "workspace_id": int(row["workspace_id"]) if row.get("workspace_id") is not None else int(row["id"]),
        "last_login_at": _iso(row.get("last_login_at")),
        "created_at": _iso(row.get("created_at")),
    }


def _require_owner(actor: dict) -> tuple[int, dict]:
    """Return (workspace_id, owner_row). Actor must be the workspace owner."""
    actor_id = int(actor["id"])
    user = user_repository.find_by_id(actor_id)
    if not user or user.get("role") != "customer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")
    seat = (user.get("seat_role") or SEAT_ROLE_OWNER).strip().lower()
    if seat != SEAT_ROLE_OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the workspace owner can manage team seats",
        )
    if str(user.get("status") or "") == STATUS_REMOVED:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account has been removed")
    workspace_id = user_repository.resolve_workspace_id(user) or actor_id
    return workspace_id, user


def list_team(*, actor: dict) -> dict:
    """Any active workspace member can list the team."""
    actor_id = int(actor["id"])
    user = user_repository.find_by_id(actor_id)
    if not user or user.get("role") != "customer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")
    workspace_id = user_repository.resolve_workspace_id(user) or actor_id
    owner = user_repository.find_by_id(workspace_id) or user
    plan = (owner.get("plan") or PLAN_FREE).strip().lower() or PLAN_FREE
    limit = seat_limit_for_plan(plan)
    members = user_repository.list_workspace_members(workspace_id)
    used = len(members)
    return {
        "workspace_id": workspace_id,
        "plan": plan,
        "seat_limit": limit,
        "seats_used": used,
        "seats_remaining": max(0, limit - used),
        "can_invite": (
            (user.get("seat_role") or SEAT_ROLE_OWNER).strip().lower() == SEAT_ROLE_OWNER
            and used < limit
            and str(user.get("status") or "") in {STATUS_ACTIVE, "paid"}
        ),
        "members": [_member_public(row) for row in members],
    }


def get_plan_summary(*, actor: dict) -> dict:
    """Plan, trial clock, and usage limits for Settings."""
    actor_id = int(actor["id"])
    user = user_repository.find_by_id(actor_id)
    if not user or user.get("role") != "customer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")
    workspace_id = user_repository.resolve_workspace_id(user) or actor_id
    owner = user_repository.find_by_id(workspace_id) or user
    plan = (owner.get("plan") or PLAN_FREE).strip().lower() or PLAN_FREE
    limit = seat_limit_for_plan(plan)
    used = user_repository.count_workspace_seats(workspace_id)
    on_trial = free_trial_applies(owner)
    expired = trial_is_expired(owner)
    seconds_left = trial_seconds_remaining(owner)
    return {
        "workspace_id": workspace_id,
        "plan": plan,
        "is_demo": bool(owner.get("is_demo")),
        "seat_limit": limit,
        "seats_used": used,
        "seats_remaining": max(0, limit - used),
        "trial": {
            "applies": on_trial,
            "days": TRIAL_DAYS if on_trial else None,
            "ends_at": _iso(owner.get("trial_ends_at")) if on_trial else None,
            "seconds_remaining": seconds_left,
            "expired": expired if on_trial else False,
        },
        "limits": {
            "radar_runs_per_day": int(settings.RADAR_RUNS_PER_DAY),
            "radar_cooldown_minutes": int(settings.radar_cooldown_minutes),
            "team_seats": limit,
        },
        "paid_comparison": {
            "plan": PLAN_PAID,
            "seat_limit": seat_limit_for_plan(PLAN_PAID),
        },
    }


def invite_member(*, actor: dict, name: str, email: str, phone: str | None = None) -> dict:
    from app.services import account_service

    workspace_id, owner = _require_owner(actor)
    if str(owner.get("status") or "") not in {STATUS_ACTIVE, "paid"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Activate your workspace before inviting teammates",
        )

    name_clean = name.strip()
    email_norm = email.strip().lower()
    if len(name_clean) < 2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Name is required")
    if "@" not in email_norm:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Valid email required")

    plan = (owner.get("plan") or PLAN_FREE).strip().lower() or PLAN_FREE
    limit = seat_limit_for_plan(plan)
    used = user_repository.count_workspace_seats(workspace_id)
    if used >= limit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Seat limit reached for {plan} plan ({limit} seats including you)",
        )

    existing = user_repository.find_by_email(email_norm)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    member_id = user_repository.insert_workspace_member(
        workspace_id=workspace_id,
        name=name_clean,
        email=email_norm,
        phone=(phone or "").strip(),
        company=owner.get("company"),
        plan=plan,
    )
    invite = account_service.issue_password_setup(member_id, reason="teammate")
    member = user_repository.find_by_id(member_id)
    assert member is not None
    return {
        **_member_public(member),
        "email_sent": bool(invite.get("email_sent")),
        "email_error": invite.get("email_error"),
        "setup_url": invite.get("setup_url"),
        "seat_limit": limit,
        "seats_used": used + 1,
    }


def remove_member(*, actor: dict, member_id: int) -> dict:
    """Owner removes a teammate seat immediately (hard delete — frees the seat)."""
    workspace_id, _owner = _require_owner(actor)
    if int(member_id) == int(actor["id"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove yourself",
        )

    member = user_repository.find_by_id(member_id)
    if (
        not member
        or member.get("role") != "customer"
        or int(member.get("workspace_id") or 0) != workspace_id
        or (member.get("seat_role") or "").strip().lower() != SEAT_ROLE_MEMBER
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teammate not found")

    user_repository.hard_delete_customer(member_id)
    return list_team(actor=actor)


def _smtp_public(row: dict | None, *, can_manage: bool) -> dict:
    """Safe SMTP status for the UI — never includes the password."""
    if not row:
        return {
            "configured": False,
            "enabled": False,
            "can_manage": can_manage,
            "host": None,
            "port": 587,
            "username": None,
            "from_email": None,
            "from_name": None,
            "use_ssl": False,
            "has_password": False,
            "updated_at": None,
            "using_platform_fallback": True,
        }
    return {
        "configured": True,
        "enabled": bool(row.get("enabled")),
        "can_manage": can_manage,
        "host": row.get("host"),
        "port": int(row.get("port") or 587),
        "username": row.get("username"),
        "from_email": row.get("from_email"),
        "from_name": row.get("from_name"),
        "use_ssl": bool(row.get("use_ssl")),
        "has_password": bool(row.get("password_encrypted")),
        "updated_at": row.get("updated_at"),
        "using_platform_fallback": not bool(row.get("enabled")),
    }


def get_smtp_settings(*, actor: dict) -> dict:
    from app.repositories import workspace_smtp_repository

    actor_id = int(actor["id"])
    user = user_repository.find_by_id(actor_id)
    if not user or user.get("role") != "customer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")
    workspace_id = user_repository.resolve_workspace_id(user) or actor_id
    can_manage = (user.get("seat_role") or SEAT_ROLE_OWNER).strip().lower() == SEAT_ROLE_OWNER
    row = workspace_smtp_repository.get_for_workspace(workspace_id)
    return _smtp_public(row, can_manage=can_manage)


def upsert_smtp_settings(*, actor: dict, body: dict) -> dict:
    from app.core.security import encrypt_secret
    from app.repositories import workspace_smtp_repository

    workspace_id, _owner = _require_owner(actor)
    host = str(body.get("host") or "").strip()
    username = str(body.get("username") or "").strip()
    from_email = str(body.get("from_email") or "").strip()
    from_name = str(body.get("from_name") or "").strip() or None
    password = str(body.get("password") or "")
    try:
        port = int(body.get("port") or 587)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid port") from exc
    use_ssl = bool(body.get("use_ssl"))
    enabled = bool(body.get("enabled", True))

    if not host:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="SMTP host is required")
    if not username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="SMTP username is required")
    if not from_email or "@" not in from_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Valid from email is required")
    if port < 1 or port > 65535:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid port")

    existing = workspace_smtp_repository.get_for_workspace(workspace_id)
    if password.strip():
        password_encrypted = encrypt_secret(password.strip())
    elif existing and existing.get("password_encrypted"):
        password_encrypted = existing["password_encrypted"]
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SMTP password is required",
        )

    row = workspace_smtp_repository.upsert(
        workspace_id=workspace_id,
        host=host,
        port=port,
        username=username,
        password_encrypted=password_encrypted,
        from_email=from_email,
        from_name=from_name,
        use_ssl=use_ssl,
        enabled=enabled,
        updated_by=int(actor["id"]),
    )
    return _smtp_public(row, can_manage=True)


def clear_smtp_settings(*, actor: dict) -> dict:
    from app.repositories import workspace_smtp_repository

    workspace_id, _owner = _require_owner(actor)
    workspace_smtp_repository.delete_for_workspace(workspace_id)
    return _smtp_public(None, can_manage=True)


def test_smtp_settings(*, actor: dict, body: dict | None = None) -> dict:
    """Send a test email using saved settings, or the payload if provided."""
    from app.core.security import decrypt_secret
    from app.repositories import workspace_smtp_repository
    from app.services import email_service

    workspace_id, owner = _require_owner(actor)
    body = body or {}
    to_email = str(body.get("to_email") or owner.get("email") or "").strip()
    if not to_email or "@" not in to_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Valid test recipient required")

    # Prefer live form values when password is included; else use saved row.
    password = str(body.get("password") or "").strip()
    if password:
        host = str(body.get("host") or "").strip()
        username = str(body.get("username") or "").strip()
        from_email = str(body.get("from_email") or "").strip()
        from_name = str(body.get("from_name") or "").strip() or None
        try:
            port = int(body.get("port") or 587)
        except (TypeError, ValueError) as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid port") from exc
        use_ssl = bool(body.get("use_ssl"))
    else:
        row = workspace_smtp_repository.get_for_workspace(workspace_id)
        if not row:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Save SMTP settings before testing, or enter a password to test now",
            )
        try:
            password = decrypt_secret(row["password_encrypted"])
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Stored SMTP password could not be read. Save settings again.",
            ) from exc
        host = row["host"]
        username = row["username"]
        from_email = row["from_email"]
        from_name = row.get("from_name")
        port = int(row["port"])
        use_ssl = bool(row.get("use_ssl"))

    if not host or not username or not from_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incomplete SMTP settings")

    try:
        email_service.send_test_via_smtp(
            to_email=to_email,
            host=host,
            port=port,
            username=username,
            password=password,
            from_email=from_email,
            from_name=from_name,
            use_ssl=use_ssl,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"SMTP test failed: {str(exc)[:200]}",
        ) from exc

    return {"ok": True, "to_email": to_email}


def load_outreach_smtp(workspace_id: int) -> dict | None:
    """Return decrypted SMTP credentials for outreach, or None to use platform mail."""
    from app.core.security import decrypt_secret
    from app.repositories import workspace_smtp_repository

    row = workspace_smtp_repository.get_for_workspace(workspace_id)
    if not row or not row.get("enabled"):
        return None
    try:
        password = decrypt_secret(row["password_encrypted"])
    except ValueError:
        return None
    return {
        "host": row["host"],
        "port": int(row["port"]),
        "username": row["username"],
        "password": password,
        "from_email": row["from_email"],
        "from_name": row.get("from_name"),
        "use_ssl": bool(row.get("use_ssl")),
    }
