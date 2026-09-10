from datetime import datetime

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.security import ROLE_PLATFORM_ADMIN
from app.repositories import payment_repository, user_repository


def _iso(value: object) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat(sep=" ", timespec="seconds")
    return str(value)


def create_customer_by_admin(
    *,
    name: str,
    email: str,
    company: str | None = None,
    phone: str | None = None,
) -> dict:
    """Admin creates a customer and emails a set-password link (no shared password)."""
    from app.services import account_service

    email_norm = email.strip().lower()
    name_clean = name.strip()
    if len(name_clean) < 2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Name is required")
    if "@" not in email_norm:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Valid email required")

    existing = user_repository.find_by_email(email_norm)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    user_id = user_repository.insert_active_customer(
        name=name_clean,
        email=email_norm,
        phone=(phone or "").strip(),
        company=(company or "").strip() or None,
        password_hash=None,
    )
    invite = account_service.issue_password_setup(user_id, reason="invite")
    user = user_repository.find_by_id(user_id)
    assert user is not None
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "phone": user["phone"],
        "company": user["company"],
        "status": user["status"],
        "is_demo": bool(user.get("is_demo")),
        "last_login_at": _iso(user.get("last_login_at")),
        "created_at": _iso(user.get("created_at")),
        "email_sent": bool(invite.get("email_sent")),
        "setup_url": invite.get("setup_url"),
    }


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
        },
        "payment": {
            "id": payment_id,
            "amount_cents": settings.ACCESS_AMOUNT_PAISE,
            "currency": settings.ACCESS_CURRENCY,
            "status": "pending",
        },
    }


def list_customers() -> list[dict]:
    rows = user_repository.list_customers()
    return [
        {
            "id": row["id"],
            "name": row["name"],
            "email": row["email"],
            "phone": row["phone"],
            "company": row["company"],
            "status": row["status"],
            "is_demo": bool(row.get("is_demo")),
            "last_login_at": _iso(row.get("last_login_at")),
            "created_at": _iso(row.get("created_at")),
        }
        for row in rows
    ]


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
