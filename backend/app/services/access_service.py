from datetime import datetime, timedelta

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.provisioning import (
    ALLOWED_PLANS,
    PLAN_FREE,
    PLAN_PAID,
    STATUS_ACTIVE,
    STATUS_PENDING_PASSWORD,
    STATUS_PROVISIONING,
    STATUS_REMOVED,
    TRIAL_PURGE_DAYS,
    uses_workspace_provisioning,
)
from app.core.security import ROLE_PLATFORM_ADMIN
from app.repositories import payment_repository, radar_repository, user_repository


def _iso(value: object) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat(sep=" ", timespec="seconds")
    return str(value)


def _purge_at(removed_at: object) -> str | None:
    if removed_at is None:
        return None
    if isinstance(removed_at, datetime):
        return _iso(removed_at + timedelta(days=TRIAL_PURGE_DAYS))
    return None


def _customer_public(user: dict, *, invite: dict | None = None) -> dict:
    removed_at = user.get("removed_at")
    row = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "phone": user["phone"],
        "company": user["company"],
        "status": user["status"],
        "plan": user.get("plan") or PLAN_FREE,
        "has_gov_api_key": bool(user.get("has_gov_api_key")),
        "is_demo": bool(user.get("is_demo")),
        "last_login_at": _iso(user.get("last_login_at")),
        "created_at": _iso(user.get("created_at")),
        "removed_at": _iso(removed_at),
        "purge_at": _purge_at(removed_at),
        "purge_days": TRIAL_PURGE_DAYS,
    }
    if invite is not None:
        row["email_sent"] = bool(invite.get("email_sent"))
        row["email_error"] = invite.get("email_error")
        row["setup_url"] = invite.get("setup_url")
    return row


def create_customer_by_admin(
    *,
    name: str,
    email: str,
    company: str | None = None,
    phone: str | None = None,
    plan: str = PLAN_FREE,
) -> dict:
    """Admin creates a customer and emails a set-password link (no shared password)."""
    from app.services import account_service

    email_norm = email.strip().lower()
    name_clean = name.strip()
    plan_clean = (plan or PLAN_FREE).strip().lower() or PLAN_FREE
    if plan_clean not in ALLOWED_PLANS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Plan must be free or paid",
        )
    if len(name_clean) < 2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Name is required")
    if "@" not in email_norm:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Valid email required")

    existing = user_repository.find_by_email(email_norm)
    if existing:
        if str(existing.get("status") or "") == STATUS_REMOVED:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This email belongs to a removed trial. Wait for purge or restore them.",
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    user_id = user_repository.insert_invited_customer(
        name=name_clean,
        email=email_norm,
        phone=(phone or "").strip(),
        company=(company or "").strip() or None,
        plan=plan_clean,
    )
    from app.services import naics_service

    naics_service.assign_defaults_if_empty(user_id)
    invite = account_service.issue_password_setup(user_id, reason="invite")
    user = user_repository.find_by_id(user_id)
    assert user is not None
    return _customer_public(user, invite=invite)


def signup_free_plan(
    *,
    name: str,
    email: str,
    phone: str,
    company: str,
) -> dict:
    """Public free-plan signup → set-password email → workspace wait (when enabled)."""
    from app.services import account_service

    if not uses_workspace_provisioning(PLAN_FREE):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Free plan signup is not available right now",
        )

    email_norm = email.strip().lower()
    name_clean = name.strip()
    phone_clean = phone.strip()
    company_clean = company.strip()
    if len(name_clean) < 2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Name is required")
    if "@" not in email_norm:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Valid email required")
    if len(phone_clean) < 5:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone is required")
    if len(company_clean) < 2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Company is required")

    existing = user_repository.find_by_email(email_norm)
    if existing and existing.get("role") == ROLE_PLATFORM_ADMIN:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This email is reserved")
    if existing and existing.get("role") == "customer":
        status_value = str(existing.get("status") or "")
        if status_value == STATUS_REMOVED:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This email is reserved until the removed trial is purged.",
            )
        if status_value in {STATUS_ACTIVE, "paid"}:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists. Sign in instead.",
            )
        # Allow re-sending setup if they never finished.
        user_repository.update_customer_profile(
            user_id=int(existing["id"]),
            name=name_clean,
            phone=phone_clean,
            company=company_clean,
        )
        user_repository.set_customer_plan(int(existing["id"]), PLAN_FREE)
        if status_value != STATUS_PROVISIONING:
            user_repository.set_customer_status(int(existing["id"]), STATUS_PENDING_PASSWORD)
        invite = account_service.issue_password_setup(int(existing["id"]), reason="free")
        user = user_repository.find_by_id(int(existing["id"]))
        assert user is not None
        return {
            "ok": True,
            "email": user["email"],
            "status": user["status"],
            "plan": PLAN_FREE,
            "email_sent": bool(invite.get("email_sent")),
            "message": (
                "Check your email for a link to create your password."
                if invite.get("email_sent")
                else "Account saved, but we could not send the email. Contact support."
            ),
        }

    user_id = user_repository.insert_invited_customer(
        name=name_clean,
        email=email_norm,
        phone=phone_clean,
        company=company_clean,
        plan=PLAN_FREE,
    )
    from app.services import naics_service

    naics_service.assign_defaults_if_empty(user_id)
    invite = account_service.issue_password_setup(user_id, reason="free")
    user = user_repository.find_by_id(user_id)
    assert user is not None
    return {
        "ok": True,
        "email": user["email"],
        "status": user["status"],
        "plan": PLAN_FREE,
        "email_sent": bool(invite.get("email_sent")),
        "message": (
            "Check your email for a link to create your password."
            if invite.get("email_sent")
            else "Account saved, but we could not send the email. Contact support."
        ),
    }


def activate_customer(
    *,
    user_id: int,
    gov_api_key: str | None = None,
    naics_codes: list[str] | None = None,
    naics_sector_code: str | None = None,
    naics_group_code: str | None = None,
) -> dict:
    """Admin finishes workspace setup — key + NAICS + active in one step."""
    from app.services import naics_service

    user = user_repository.find_by_id(user_id)
    if not user or user.get("role") != "customer":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if str(user.get("status") or "") == STATUS_REMOVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Removed users cannot be activated. Restore them first.",
        )
    if (user.get("seat_role") or "owner").strip().lower() == "member":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Teammate seats inherit the owner's workspace — activate the owner instead.",
        )
    if not user.get("password_hash"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Customer must set a password before activation",
        )

    if naics_sector_code or naics_group_code or naics_codes is not None:
        naics_service.set_user_coverage(
            user_id=user_id,
            codes=naics_codes,
            sector_code=naics_sector_code,
            group_code=naics_group_code,
        )
    else:
        naics_service.assign_defaults_if_empty(user_id)

    user_repository.activate_customer(user_id=user_id, gov_api_key=gov_api_key)
    refreshed = user_repository.find_by_id(user_id)
    assert refreshed is not None
    return _customer_public(
        {
            **refreshed,
            "has_gov_api_key": bool(user_repository.get_gov_api_key(user_id)),
        }
    )


def create_access_request(
    *,
    name: str,
    email: str,
    phone: str,
    company: str,
) -> dict:
    email_norm = email.strip().lower()
    existing = user_repository.find_by_email(email_norm)
    if existing and existing.get("role") == ROLE_PLATFORM_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This email is reserved",
        )
    if existing and existing.get("role") == "customer":
        user_id = int(existing["id"])
        user_repository.update_customer_profile(
            user_id=user_id, name=name.strip(), phone=phone.strip(), company=company.strip()
        )
    else:
        user_id = user_repository.insert_customer(
            name=name.strip(),
            email=email_norm,
            phone=phone.strip(),
            company=company.strip() or None,
        )
    user_repository.set_customer_plan(user_id, PLAN_PAID)
    payment = payment_repository.find_pending_for_user(user_id)
    if payment is None:
        payment_id = payment_repository.insert_pending(
            user_id=user_id,
            amount_cents=settings.ACCESS_AMOUNT_PAISE,
            currency=settings.ACCESS_CURRENCY,
        )
    else:
        payment_id = int(payment["id"])
    user = user_repository.find_by_id(user_id)
    assert user is not None
    return {
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "phone": user["phone"],
            "company": user["company"],
            "status": user["status"],
            "plan": user.get("plan") or PLAN_PAID,
        },
        "payment": {
            "id": payment_id,
            "amount_cents": settings.ACCESS_AMOUNT_PAISE,
            "currency": settings.ACCESS_CURRENCY,
            "status": "pending",
        },
    }


def list_customers() -> list[dict]:
    purge_due_customers()
    rows = user_repository.list_customers()
    return [_customer_public(row) for row in rows]


def set_plan(*, user_id: int, plan: str) -> dict:
    """Flip free↔paid on the same account (same login)."""
    plan_clean = (plan or "").strip().lower()
    if plan_clean not in ALLOWED_PLANS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Plan must be free or paid",
        )
    user = user_repository.find_by_id(user_id)
    if not user or user.get("role") != "customer":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if str(user.get("status") or "") == STATUS_REMOVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change plan for a removed user",
        )
    user_repository.set_customer_plan(user_id, plan_clean)
    refreshed = user_repository.find_by_id(user_id)
    assert refreshed is not None
    return _customer_public(
        {
            **refreshed,
            "has_gov_api_key": bool(user_repository.get_gov_api_key(user_id)),
        }
    )


def remove_customer(*, user_id: int) -> dict:
    """Soft-remove: block login now; hard-delete after TRIAL_PURGE_DAYS."""
    user = user_repository.find_by_id(user_id)
    if not user or user.get("role") != "customer":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if bool(user.get("is_demo")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Demo user cannot be removed",
        )
    if str(user.get("status") or "") == STATUS_REMOVED:
        return _customer_public(user)

    user_repository.mark_customer_removed(user_id)
    radar_repository.clear_user_workspace(user_id)
    refreshed = user_repository.find_by_id(user_id)
    assert refreshed is not None
    return _customer_public(refreshed)


def restore_customer(*, user_id: int) -> dict:
    """Undo soft-remove before the 2-day purge window ends."""
    user = user_repository.find_by_id(user_id)
    if not user or user.get("role") != "customer":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if str(user.get("status") or "") != STATUS_REMOVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not removed",
        )
    user_repository.restore_customer(user_id)
    refreshed = user_repository.find_by_id(user_id)
    assert refreshed is not None
    return _customer_public(
        {
            **refreshed,
            "has_gov_api_key": bool(user_repository.get_gov_api_key(user_id)),
        }
    )


def purge_due_customers() -> dict:
    """Hard-delete soft-removed customers past the retention window."""
    due = user_repository.list_due_for_purge(purge_days=TRIAL_PURGE_DAYS)
    purged: list[dict] = []
    for row in due:
        uid = int(row["id"])
        radar_repository.clear_user_workspace(uid)
        user_repository.hard_delete_customer(uid)
        purged.append({"id": uid, "email": row.get("email"), "name": row.get("name")})
    return {"purged": purged, "count": len(purged), "purge_days": TRIAL_PURGE_DAYS}


def list_payments() -> list[dict]:
    rows = payment_repository.list_all()
    return [
        {
            "id": row["id"],
            "user_id": row["user_id"],
            "user_name": row["user_name"],
            "user_email": row["user_email"],
            "user_phone": row["user_phone"],
            "amount_cents": row["amount_cents"],
            "currency": row["currency"],
            "status": row["status"],
            "provider": row["provider"],
            "paid_at": _iso(row.get("paid_at")),
            "created_at": _iso(row.get("created_at")),
        }
        for row in rows
    ]
