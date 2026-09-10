from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, status

from app.repositories import lead_repository


def _iso(value: object) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat(sep=" ", timespec="seconds")
    return str(value)


def submit_contact(
    *,
    name: str,
    email: str,
    company: str | None,
    phone: str | None,
    job_title: str | None,
    reason: str,
    message: str,
) -> dict:
    if len(message.strip()) < 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message is too short",
        )
    lead_id = lead_repository.create_lead(
        name=name,
        email=email,
        company=company,
        phone=phone,
        job_title=job_title,
        reason=reason,
        message=message,
    )
    return {
        "ok": True,
        "id": lead_id,
        "reference": f"OP-{lead_id:06d}",
    }


def list_leads(*, status: str | None = None) -> list[dict]:
    rows = lead_repository.list_leads(status=status)
    return [
        {
            "id": row["id"],
            "name": row["name"],
            "email": row["email"],
            "company": row.get("company"),
            "phone": row.get("phone"),
            "job_title": row.get("job_title"),
            "reason": row["reason"],
            "message": row["message"],
            "status": row["status"],
            "admin_notes": row.get("admin_notes"),
            "created_at": _iso(row.get("created_at")),
            "updated_at": _iso(row.get("updated_at")),
        }
        for row in rows
    ]


def update_lead(
    *,
    lead_id: int,
    status: str,
    admin_notes: str | None,
    assigned_admin_id: int | None,
) -> dict:
    allowed = {"new", "in_progress", "contacted", "closed"}
    if status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"status must be one of {sorted(allowed)}",
        )
    row = lead_repository.update_lead(
        lead_id=lead_id,
        status=status,
        admin_notes=admin_notes,
        assigned_admin_id=assigned_admin_id,
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "company": row.get("company"),
        "status": row["status"],
        "admin_notes": row.get("admin_notes"),
        "updated_at": _iso(row.get("updated_at")),
    }
