from __future__ import annotations

import psycopg
from psycopg.rows import dict_row

from app.core.config import settings


def connect_database() -> psycopg.Connection:
    """Open a Postgres connection to Supabase (or any DATABASE_URL)."""
    url = (settings.DATABASE_URL or "").strip()
    if not url:
        raise RuntimeError(
            "DATABASE_URL is not set. Add your Supabase Postgres URI to backend/.env "
            "(see supabase/SETUP.md)."
        )
    return psycopg.connect(url, row_factory=dict_row, autocommit=True)
