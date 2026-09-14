"""Platform tables live in Supabase Postgres.

Fresh database:
  1) Run `supabase/schema.sql` in the Supabase SQL Editor
  2) `python -m app.db.migrate --stamp`
  3) `python seed_accounts.py`

Existing database (schema already applied earlier):
  1) `python -m app.db.migrate`
  2) `python seed_accounts.py` if admin/demo missing

See `supabase/SETUP.md`.
"""

from __future__ import annotations


def bootstrap() -> None:
    raise SystemExit(
        "Use SQL migrations instead of MySQL bootstrap.\n"
        "  Existing DB:  python -m app.db.migrate\n"
        "  Fresh DB:     run supabase/schema.sql, then python -m app.db.migrate --stamp\n"
        "See supabase/SETUP.md"
    )


if __name__ == "__main__":
    bootstrap()
