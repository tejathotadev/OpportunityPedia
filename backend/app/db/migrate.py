"""Apply versioned SQL files from supabase/migrations/.

Usage (from backend/):
  python -m app.db.migrate           # apply pending migrations
  python -m app.db.migrate --stamp   # mark all as applied (after fresh schema.sql)
  python -m app.db.migrate --status  # list applied / pending

Migrations run in filename order inside a transaction. Re-runs skip versions
already recorded in public.schema_migrations.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from app.db.connection import connect_database, init_pool, close_pool
from app.core.config import settings

# backend/app/db/migrate.py → repo root is parents[3]
_MIGRATIONS_DIR = Path(__file__).resolve().parents[3] / "supabase" / "migrations"

_ENSURE_TRACKER = """
create table if not exists public.schema_migrations (
  version     text primary key,
  applied_at  timestamptz not null default now()
);
"""


def _migration_files() -> list[Path]:
    if not _MIGRATIONS_DIR.is_dir():
        return []
    return sorted(p for p in _MIGRATIONS_DIR.glob("*.sql") if p.is_file())


def _version_of(path: Path) -> str:
    return path.stem


def _applied_versions(cur) -> set[str]:
    cur.execute(_ENSURE_TRACKER)
    cur.execute("select version from public.schema_migrations")
    return {str(row["version"]) for row in cur.fetchall()}


def status() -> int:
    init_pool(min_size=1, max_size=2)
    try:
        with connect_database() as conn:
            # migrate uses explicit commits
            conn.autocommit = True
            with conn.cursor() as cur:
                applied = _applied_versions(cur)
        files = _migration_files()
        if not files:
            print(f"No migrations in {_MIGRATIONS_DIR}")
            return 0
        print(f"Migrations dir: {_MIGRATIONS_DIR}")
        pending = 0
        for path in files:
            ver = _version_of(path)
            mark = "applied" if ver in applied else "PENDING"
            if ver not in applied:
                pending += 1
            print(f"  [{mark}] {ver}")
        print(f"{pending} pending, {len(applied)} recorded")
        return 0
    finally:
        close_pool()


def stamp() -> int:
    """Record every migration as applied without executing SQL (fresh schema.sql)."""
    init_pool(min_size=1, max_size=2)
    try:
        with connect_database() as conn:
            conn.autocommit = False
            with conn.cursor() as cur:
                cur.execute(_ENSURE_TRACKER)
                applied = _applied_versions(cur)
                for path in _migration_files():
                    ver = _version_of(path)
                    if ver in applied:
                        print(f"  skip (already stamped) {ver}")
                        continue
                    cur.execute(
                        "insert into public.schema_migrations (version) values (%s)",
                        (ver,),
                    )
                    print(f"  stamped {ver}")
            conn.commit()
        print("Stamp complete.")
        return 0
    except Exception as exc:
        print(f"Stamp failed: {exc}", file=sys.stderr)
        return 1
    finally:
        close_pool()


def apply() -> int:
    if not settings.DATABASE_URL:
        print("DATABASE_URL is not set.", file=sys.stderr)
        return 1
    files = _migration_files()
    if not files:
        print(f"No migrations in {_MIGRATIONS_DIR}")
        return 0

    init_pool(min_size=1, max_size=2)
    applied_count = 0
    try:
        with connect_database() as conn:
            # One transaction per migration file.
            for path in files:
                ver = _version_of(path)
                conn.autocommit = True
                with conn.cursor() as cur:
                    already = _applied_versions(cur)
                if ver in already:
                    print(f"  skip {ver}")
                    continue

                sql = path.read_text(encoding="utf-8")
                print(f"  apply {ver} ...")
                conn.autocommit = False
                try:
                    with conn.cursor() as cur:
                        cur.execute(_ENSURE_TRACKER)
                        cur.execute(sql)
                        cur.execute(
                            "insert into public.schema_migrations (version) values (%s)",
                            (ver,),
                        )
                    conn.commit()
                    applied_count += 1
                    print(f"  ok    {ver}")
                except Exception:
                    conn.rollback()
                    raise
        print(f"Done. Applied {applied_count} migration(s).")
        return 0
    except Exception as exc:
        print(f"Migrate failed: {exc}", file=sys.stderr)
        return 1
    finally:
        close_pool()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Apply OpportunityPedia SQL migrations")
    parser.add_argument(
        "--stamp",
        action="store_true",
        help="Mark all migrations applied without running them (after schema.sql)",
    )
    parser.add_argument(
        "--status",
        action="store_true",
        help="Show applied vs pending migrations",
    )
    args = parser.parse_args(argv)
    if args.status:
        return status()
    if args.stamp:
        return stamp()
    return apply()


if __name__ == "__main__":
    raise SystemExit(main())
