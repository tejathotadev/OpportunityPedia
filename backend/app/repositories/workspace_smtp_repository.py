"""Workspace SMTP settings — company mail for outreach."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.db.connection import connect_database
from app.db.schema import Tables

_ENSURED = False


def _ensure_table() -> None:
    global _ENSURED
    if _ENSURED:
        return
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                CREATE TABLE IF NOT EXISTS {Tables.workspace_smtp_settings} (
                  workspace_id        bigint PRIMARY KEY REFERENCES {Tables.users} (id) ON DELETE CASCADE,
                  host                text NOT NULL,
                  port                integer NOT NULL DEFAULT 587
                                        CHECK (port > 0 AND port < 65536),
                  username            text NOT NULL,
                  password_encrypted  text NOT NULL,
                  from_email          text NOT NULL,
                  from_name           text,
                  use_ssl             boolean NOT NULL DEFAULT false,
                  enabled             boolean NOT NULL DEFAULT true,
                  updated_by          bigint REFERENCES {Tables.users} (id) ON DELETE SET NULL,
                  created_at          timestamptz NOT NULL DEFAULT now(),
                  updated_at          timestamptz NOT NULL DEFAULT now()
                )
                """
            )
    _ENSURED = True


def _iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).isoformat(timespec="seconds")
    return str(value)


def _map_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "workspace_id": int(row["workspace_id"]),
        "host": row["host"],
        "port": int(row["port"]),
        "username": row["username"],
        "password_encrypted": row["password_encrypted"],
        "from_email": row["from_email"],
        "from_name": row.get("from_name"),
        "use_ssl": bool(row.get("use_ssl")),
        "enabled": bool(row.get("enabled")),
        "updated_by": int(row["updated_by"]) if row.get("updated_by") is not None else None,
        "created_at": _iso(row.get("created_at")),
        "updated_at": _iso(row.get("updated_at")),
    }


def get_for_workspace(workspace_id: int) -> dict[str, Any] | None:
    _ensure_table()
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT workspace_id, host, port, username, password_encrypted,
                       from_email, from_name, use_ssl, enabled, updated_by,
                       created_at, updated_at
                FROM {Tables.workspace_smtp_settings}
                WHERE workspace_id = %s
                """,
                (workspace_id,),
            )
            row = cur.fetchone()
    return _map_row(row) if row else None


def upsert(
    *,
    workspace_id: int,
    host: str,
    port: int,
    username: str,
    password_encrypted: str,
    from_email: str,
    from_name: str | None,
    use_ssl: bool,
    enabled: bool,
    updated_by: int,
) -> dict[str, Any]:
    _ensure_table()
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                INSERT INTO {Tables.workspace_smtp_settings}
                    (workspace_id, host, port, username, password_encrypted,
                     from_email, from_name, use_ssl, enabled, updated_by,
                     created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now(), now())
                ON CONFLICT (workspace_id) DO UPDATE SET
                    host = EXCLUDED.host,
                    port = EXCLUDED.port,
                    username = EXCLUDED.username,
                    password_encrypted = EXCLUDED.password_encrypted,
                    from_email = EXCLUDED.from_email,
                    from_name = EXCLUDED.from_name,
                    use_ssl = EXCLUDED.use_ssl,
                    enabled = EXCLUDED.enabled,
                    updated_by = EXCLUDED.updated_by,
                    updated_at = now()
                RETURNING workspace_id, host, port, username, password_encrypted,
                          from_email, from_name, use_ssl, enabled, updated_by,
                          created_at, updated_at
                """,
                (
                    workspace_id,
                    host,
                    port,
                    username,
                    password_encrypted,
                    from_email,
                    from_name,
                    use_ssl,
                    enabled,
                    updated_by,
                ),
            )
            row = cur.fetchone()
    return _map_row(row)


def delete_for_workspace(workspace_id: int) -> bool:
    _ensure_table()
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                DELETE FROM {Tables.workspace_smtp_settings}
                WHERE workspace_id = %s
                """,
                (workspace_id,),
            )
            return cur.rowcount > 0
