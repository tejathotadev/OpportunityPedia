"""Seed platform admin + demo customer into Supabase Postgres.

Usage (from backend/):
  python seed_accounts.py
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.core.config import settings
from app.core.security import hash_password
from app.repositories import user_repository


def seed_accounts() -> None:
    if not settings.DATABASE_URL:
        raise SystemExit("Set DATABASE_URL in backend/.env (see supabase/SETUP.md)")

    admin_email = settings.ADMIN_EMAIL
    admin_password = settings.ADMIN_PASSWORD
    if not admin_email or not admin_password:
        raise SystemExit("Set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env")

    admin_id = user_repository.upsert_seed_user(
        email=admin_email,
        password_hash=hash_password(admin_password),
        name=settings.ADMIN_NAME,
        company=None,
        role="platform_admin",
        status="active",
        is_demo=False,
    )
    print(f"Admin ready: {admin_email} (id={admin_id})")

    demo_email = settings.DEMO_EMAIL
    demo_password = settings.DEMO_PASSWORD
    if not demo_email or not demo_password:
        raise SystemExit("Set DEMO_EMAIL and DEMO_PASSWORD in backend/.env")

    demo_company = settings.DEMO_COMPANY
    demo_id = user_repository.upsert_seed_user(
        email=demo_email,
        password_hash=hash_password(demo_password),
        name=settings.DEMO_NAME,
        company=demo_company,
        role="customer",
        status="active",
        is_demo=True,
    )
    print(f"Demo ready:  {demo_email} (id={demo_id})")
    print("Sign in: /admin/login (admin) · /login (demo)")


if __name__ == "__main__":
    seed_accounts()
