from __future__ import annotations

import razorpay
from fastapi import HTTPException, status

from app.core.config import settings
from app.repositories import payment_repository, user_repository
from app.services import account_service


def _client() -> razorpay.Client:
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Razorpay test keys are not set. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to backend/.env",
        )
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


def create_order(*, payment_id: int) -> dict:
    payment = payment_repository.find_by_id(payment_id)
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    if payment.get("status") == "paid":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Payment already completed")
    user = user_repository.find_by_id(int(payment["user_id"]))
    if not user or user.get("role") != "customer":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid customer")
    amount = int(payment["amount_cents"])
    currency = str(payment.get("currency") or settings.ACCESS_CURRENCY).upper()
    client = _client()
    order = client.order.create(
        {
            "amount": amount,
            "currency": currency,
            "receipt": f"radar_{payment_id}"[:40],
            "payment_capture": 1,
            "notes": {"payment_id": str(payment_id), "user_id": str(user["id"])},
        }
    )
    order_id = order["id"]
    payment_repository.set_order_id(payment_id, order_id)
    return {
        "key_id": settings.RAZORPAY_KEY_ID,
        "order_id": order_id,
        "amount": amount,
        "currency": currency,
        "name": "Radar",
        "description": "Radar access",
        "prefill": {
            "name": user["name"],
            "email": user["email"],
            "contact": user.get("phone") or "",
        },
        "payment_id": payment_id,
    }


def verify_payment(
    *,
    payment_id: int,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
) -> dict:
    payment = payment_repository.find_by_id(payment_id)
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    stored_order = payment.get("provider_order_id") or ""
    if stored_order and stored_order != razorpay_order_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order mismatch")
    client = _client()
    try:
        client.utility.verify_payment_signature(
            {
                "razorpay_order_id": razorpay_order_id,
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_signature": razorpay_signature,
            }
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payment signature"
        ) from exc
    payment_repository.mark_paid(payment_id, provider_payment_id=razorpay_payment_id)
    user_id = int(payment["user_id"])
    from app.core.provisioning import PLAN_PAID

    user_repository.set_customer_plan(user_id, PLAN_PAID)
    user_repository.set_customer_status(user_id, "paid")
    setup = account_service.issue_password_setup(user_id)
    return {"status": "paid", "payment_id": payment_id, **setup}
