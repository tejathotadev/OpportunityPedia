from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.core.config import settings

_pool: ConnectionPool | None = None


def _database_url() -> str:
    url = (settings.DATABASE_URL or "").strip()
    if not url:
        raise RuntimeError(
            "DATABASE_URL is not set. Add your Supabase Postgres URI to backend/.env "
            "(see supabase/SETUP.md)."
        )
    return url


def init_pool(*, min_size: int = 1, max_size: int = 10) -> None:
    """Create the shared pool (idempotent). Call from app lifespan."""
    global _pool
    if _pool is not None:
        return
    _pool = ConnectionPool(
        conninfo=_database_url(),
        min_size=max(1, int(min_size)),
        max_size=max(1, int(max_size)),
        open=True,
        kwargs={"row_factory": dict_row, "autocommit": True},
    )


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


def pool_stats() -> dict[str, int | str]:
    """Lightweight pool snapshot for /health (no secrets)."""
    if _pool is None:
        return {"status": "closed"}
    try:
        measures = _pool.get_stats()
        return {
            "status": "open",
            "poolMin": int(_pool.min_size),
            "poolMax": int(_pool.max_size),
            **{str(k): int(v) for k, v in measures.items()},
        }
    except Exception:
        return {"status": "open"}


def _ensure_pool() -> ConnectionPool:
    if _pool is None:
        # Lazy open so scripts/tests that skip lifespan still work.
        init_pool(
            min_size=settings.DB_POOL_MIN_SIZE,
            max_size=settings.DB_POOL_MAX_SIZE,
        )
    assert _pool is not None
    return _pool


@contextmanager
def connect_database() -> Iterator[psycopg.Connection]:
    """Borrow a pooled Postgres connection (autocommit — single statements)."""
    with _ensure_pool().connection() as conn:
        yield conn


@contextmanager
def transaction() -> Iterator[psycopg.Connection]:
    """Borrow a pooled connection with commit/rollback for multi-statement writes.

    Use for flows that must succeed or fail together (assign+activity, job
    replace, set-password + token, workspace purge, etc.).
    """
    with _ensure_pool().connection() as conn:
        conn.autocommit = False
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            try:
                conn.autocommit = True
            except Exception:
                pass
