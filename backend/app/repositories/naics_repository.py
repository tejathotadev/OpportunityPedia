from __future__ import annotations

from typing import Any

from app.data.naics_sector_56 import DEFAULT_USER_NAICS_CODES, SECTOR_SEEDS
from app.db.connection import connect_database
from app.db.schema import Tables

_ready = False


def _ensure_tables(cur) -> None:
    global _ready
    if _ready:
        return
    cur.execute(
        f"""
        CREATE TABLE IF NOT EXISTS {Tables.naics_codes} (
          code          text PRIMARY KEY,
          title         text NOT NULL,
          sector_code   text NOT NULL,
          sector_title  text NOT NULL,
          group_code    text NOT NULL,
          group_title   text NOT NULL,
          is_active     boolean NOT NULL DEFAULT TRUE,
          created_at    timestamptz NOT NULL DEFAULT now()
        )
        """
    )
    cur.execute(
        f"""
        CREATE INDEX IF NOT EXISTS ix_naics_codes_sector
          ON {Tables.naics_codes} (sector_code, group_code, code)
        """
    )
    cur.execute(
        f"""
        CREATE TABLE IF NOT EXISTS {Tables.user_naics_codes} (
          user_id     bigint NOT NULL REFERENCES {Tables.users} (id) ON DELETE CASCADE,
          naics_code  text NOT NULL REFERENCES {Tables.naics_codes} (code) ON DELETE CASCADE,
          created_at  timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (user_id, naics_code)
        )
        """
    )
    cur.execute(
        f"""
        CREATE INDEX IF NOT EXISTS ix_user_naics_user
          ON {Tables.user_naics_codes} (user_id)
        """
    )
    _ready = True


def seed_catalog() -> int:
    """Upsert registered sector seeds. Safe to call on every admin catalog load."""
    inserted = 0
    with connect_database() as conn:
        with conn.cursor() as cur:
            _ensure_tables(cur)
            for sector in SECTOR_SEEDS:
                sector_code = sector["sector_code"]
                sector_title = sector["sector_title"]
                for group in sector["groups"]:
                    group_code = group["group_code"]
                    group_title = group["group_title"]
                    for code, title in group["codes"]:
                        cur.execute(
                            f"""
                            INSERT INTO {Tables.naics_codes}
                              (code, title, sector_code, sector_title, group_code, group_title, is_active)
                            VALUES (%s, %s, %s, %s, %s, %s, TRUE)
                            ON CONFLICT (code) DO UPDATE SET
                              title = EXCLUDED.title,
                              sector_code = EXCLUDED.sector_code,
                              sector_title = EXCLUDED.sector_title,
                              group_code = EXCLUDED.group_code,
                              group_title = EXCLUDED.group_title
                            """,
                            (code, title, sector_code, sector_title, group_code, group_title),
                        )
                        inserted += 1
    return inserted


def list_catalog(*, active_only: bool = True) -> list[dict[str, Any]]:
    with connect_database() as conn:
        with conn.cursor() as cur:
            _ensure_tables(cur)
            if active_only:
                cur.execute(
                    f"""
                    SELECT code, title, sector_code, sector_title, group_code, group_title, is_active
                    FROM {Tables.naics_codes}
                    WHERE is_active = TRUE
                    ORDER BY sector_code, group_code, code
                    """
                )
            else:
                cur.execute(
                    f"""
                    SELECT code, title, sector_code, sector_title, group_code, group_title, is_active
                    FROM {Tables.naics_codes}
                    ORDER BY sector_code, group_code, code
                    """
                )
            return list(cur.fetchall())


def list_codes_for_sector(sector_code: str) -> list[str]:
    with connect_database() as conn:
        with conn.cursor() as cur:
            _ensure_tables(cur)
            cur.execute(
                f"""
                SELECT code FROM {Tables.naics_codes}
                WHERE sector_code = %s AND is_active = TRUE
                ORDER BY code
                """,
                (sector_code.strip(),),
            )
            return [str(row["code"]) for row in cur.fetchall()]


def list_codes_for_group(group_code: str) -> list[str]:
    with connect_database() as conn:
        with conn.cursor() as cur:
            _ensure_tables(cur)
            cur.execute(
                f"""
                SELECT code FROM {Tables.naics_codes}
                WHERE group_code = %s AND is_active = TRUE
                ORDER BY code
                """,
                (group_code.strip(),),
            )
            return [str(row["code"]) for row in cur.fetchall()]


def filter_known_codes(codes: list[str]) -> list[str]:
    cleaned = sorted({c.strip() for c in codes if c and c.strip()})
    if not cleaned:
        return []
    with connect_database() as conn:
        with conn.cursor() as cur:
            _ensure_tables(cur)
            cur.execute(
                f"""
                SELECT code FROM {Tables.naics_codes}
                WHERE code = ANY(%s) AND is_active = TRUE
                ORDER BY code
                """,
                (cleaned,),
            )
            return [str(row["code"]) for row in cur.fetchall()]


def list_user_codes(user_id: int) -> list[str]:
    with connect_database() as conn:
        with conn.cursor() as cur:
            _ensure_tables(cur)
            cur.execute(
                f"""
                SELECT naics_code
                FROM {Tables.user_naics_codes}
                WHERE user_id = %s
                ORDER BY naics_code
                """,
                (user_id,),
            )
            return [str(row["naics_code"]) for row in cur.fetchall()]


def list_user_code_details(user_id: int) -> list[dict[str, Any]]:
    with connect_database() as conn:
        with conn.cursor() as cur:
            _ensure_tables(cur)
            cur.execute(
                f"""
                SELECT c.code, c.title, c.sector_code, c.sector_title, c.group_code, c.group_title
                FROM {Tables.user_naics_codes} u
                JOIN {Tables.naics_codes} c ON c.code = u.naics_code
                WHERE u.user_id = %s
                ORDER BY c.sector_code, c.group_code, c.code
                """,
                (user_id,),
            )
            return list(cur.fetchall())


def replace_user_codes(user_id: int, codes: list[str]) -> list[str]:
    known = filter_known_codes(codes)
    with connect_database() as conn:
        with conn.cursor() as cur:
            _ensure_tables(cur)
            cur.execute(
                f"DELETE FROM {Tables.user_naics_codes} WHERE user_id = %s",
                (user_id,),
            )
            for code in known:
                cur.execute(
                    f"""
                    INSERT INTO {Tables.user_naics_codes} (user_id, naics_code)
                    VALUES (%s, %s)
                    ON CONFLICT DO NOTHING
                    """,
                    (user_id, code),
                )
    return known


def assign_default_user_codes(user_id: int) -> list[str]:
    seed_catalog()
    return replace_user_codes(user_id, list(DEFAULT_USER_NAICS_CODES))


def title_for_code(code: str) -> str | None:
    with connect_database() as conn:
        with conn.cursor() as cur:
            _ensure_tables(cur)
            cur.execute(
                f"SELECT title FROM {Tables.naics_codes} WHERE code = %s LIMIT 1",
                (code.strip()[:6],),
            )
            row = cur.fetchone()
            return str(row["title"]) if row else None
