"""MySQL bootstrap is retired.

Platform tables live in Supabase. Apply `supabase/schema.sql` in the
Supabase SQL Editor, then set DATABASE_URL and run `python seed_accounts.py`.
"""

from __future__ import annotations


def bootstrap() -> None:
    raise SystemExit(
        "MySQL bootstrap is retired.\n"
        "1) Run supabase/schema.sql in the Supabase SQL Editor\n"
        "2) Set DATABASE_URL in backend/.env\n"
        "3) python seed_accounts.py\n"
        "See supabase/SETUP.md"
    )


if __name__ == "__main__":
    bootstrap()
