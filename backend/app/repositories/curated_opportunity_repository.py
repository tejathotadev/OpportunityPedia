"""Admin-curated opportunities + per-workspace visibility."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from app.db.connection import connect_database, transaction
from app.db.schema import Tables


def _ensure_tables(cur) -> None:
    cur.execute(
        f"""
        CREATE TABLE IF NOT EXISTS {Tables.curated_opportunities} (
          id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          category            text NOT NULL CHECK (category IN ('commercial', 'government')),
          opportunity_type    text NOT NULL,
          company             text NOT NULL DEFAULT '',
          title               text NOT NULL,
          location            text NOT NULL DEFAULT '',
          engagement          text,
          duration            text,
          openings            integer,
          experience          text,
          skills              jsonb NOT NULL DEFAULT '[]'::jsonb,
          technologies        jsonb NOT NULL DEFAULT '[]'::jsonb,
          vendor_looking_for  text,
          partnership_model   text,
          client_industry     text,
          candidate_requirement text,
          contact_name        text,
          contact_email       text,
          source              text NOT NULL DEFAULT 'LinkedIn',
          source_url          text,
          priority            text NOT NULL DEFAULT 'very_hot'
                                CHECK (priority = 'very_hot'),
          description         text NOT NULL DEFAULT '',
          detected_at         timestamptz NOT NULL DEFAULT now(),
          status              text NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'archived')),
          payload             jsonb NOT NULL DEFAULT '{{}}'::jsonb,
          created_by          bigint,
          created_at          timestamptz NOT NULL DEFAULT now(),
          updated_at          timestamptz NOT NULL DEFAULT now()
        )
        """
    )
    cur.execute(
        f"""
        CREATE TABLE IF NOT EXISTS {Tables.curated_opportunity_visibility} (
          opportunity_id  uuid NOT NULL
                            REFERENCES {Tables.curated_opportunities} (id) ON DELETE CASCADE,
          workspace_id    bigint NOT NULL,
          created_at      timestamptz NOT NULL DEFAULT now(),
          released_at     timestamptz,
          PRIMARY KEY (opportunity_id, workspace_id)
        )
        """
    )
    cur.execute(
        f"""
        ALTER TABLE {Tables.curated_opportunity_visibility}
          ADD COLUMN IF NOT EXISTS released_at timestamptz
        """
    )


def _as_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return [str(v).strip() for v in parsed if str(v).strip()]
        except Exception:
            pass
        return [p.strip() for p in value.split(",") if p.strip()]
    return []


def _workspace_had_successful_radar(cur, workspace_id: int) -> bool:
    """True if this workspace owner has at least one successful Radar run."""
    try:
        cur.execute(
            f"""
            SELECT 1
            FROM {Tables.radar_runs}
            WHERE user_id = %s AND status = 'ok'
            LIMIT 1
            """,
            (int(workspace_id),),
        )
        return cur.fetchone() is not None
    except Exception:
        return False


def _insert_visibility_row(cur, *, opportunity_id: Any, workspace_id: int) -> None:
    """Insert one visibility row; unlock immediately if workspace already ran Radar ok."""
    released_at = (
        datetime.now(timezone.utc)
        if _workspace_had_successful_radar(cur, workspace_id)
        else None
    )
    cur.execute(
        f"""
        INSERT INTO {Tables.curated_opportunity_visibility}
          (opportunity_id, workspace_id, released_at)
        VALUES (%s, %s, %s)
        ON CONFLICT (opportunity_id, workspace_id) DO NOTHING
        """,
        (opportunity_id, int(workspace_id), released_at),
    )


def _sync_visibility(cur, *, opportunity_id: Any, workspace_ids: list[int]) -> list[int]:
    """Diff visibility: keep released_at for existing workspaces; only add/remove.

    - Removed workspaces: delete row
    - Kept workspaces: untouched (released_at preserved)
    - New workspaces: insert; auto-release if they already have a successful Radar run
    """
    wanted = sorted({int(x) for x in workspace_ids})
    cur.execute(
        f"""
        SELECT workspace_id
        FROM {Tables.curated_opportunity_visibility}
        WHERE opportunity_id = %s
        """,
        (opportunity_id,),
    )
    existing_ids = {int(r["workspace_id"]) for r in cur.fetchall()}
    wanted_set = set(wanted)

    to_remove = existing_ids - wanted_set
    to_add = wanted_set - existing_ids

    if to_remove:
        cur.execute(
            f"""
            DELETE FROM {Tables.curated_opportunity_visibility}
            WHERE opportunity_id = %s
              AND workspace_id = ANY(%s)
            """,
            (opportunity_id, list(to_remove)),
        )

    for wid in sorted(to_add):
        _insert_visibility_row(cur, opportunity_id=opportunity_id, workspace_id=wid)

    # Heal rows left locked by older wipe-and-reinsert saves: if the workspace
    # already completed Radar successfully, unlock without waiting for another run.
    kept = wanted_set & existing_ids
    if kept:
        cur.execute(
            f"""
            SELECT workspace_id
            FROM {Tables.curated_opportunity_visibility}
            WHERE opportunity_id = %s
              AND workspace_id = ANY(%s)
              AND released_at IS NULL
            """,
            (opportunity_id, list(kept)),
        )
        locked_kept = [int(r["workspace_id"]) for r in cur.fetchall()]
        now = datetime.now(timezone.utc)
        for wid in locked_kept:
            if _workspace_had_successful_radar(cur, wid):
                cur.execute(
                    f"""
                    UPDATE {Tables.curated_opportunity_visibility}
                    SET released_at = %s
                    WHERE opportunity_id = %s
                      AND workspace_id = %s
                      AND released_at IS NULL
                    """,
                    (now, opportunity_id, wid),
                )

    return wanted


def _row_to_dict(row: dict[str, Any], *, visible_workspace_ids: list[int] | None = None) -> dict[str, Any]:
    oid = row["id"]
    return {
        "id": str(oid),
        "category": row["category"],
        "opportunityType": row["opportunity_type"],
        "company": row.get("company") or "",
        "title": row.get("title") or "",
        "location": row.get("location") or "",
        "engagement": row.get("engagement"),
        "duration": row.get("duration"),
        "openings": row.get("openings"),
        "experience": row.get("experience"),
        "skills": _as_list(row.get("skills")),
        "technologies": _as_list(row.get("technologies")),
        "vendorLookingFor": row.get("vendor_looking_for"),
        "partnershipModel": row.get("partnership_model"),
        "clientIndustry": row.get("client_industry"),
        "candidateRequirement": row.get("candidate_requirement"),
        "contactName": row.get("contact_name"),
        "contactEmail": row.get("contact_email"),
        "source": row.get("source") or "LinkedIn",
        "sourceUrl": row.get("source_url"),
        "priority": row.get("priority") or "very_hot",
        "description": row.get("description") or "",
        "detectedAt": row["detected_at"].isoformat() if row.get("detected_at") else None,
        "status": row.get("status") or "active",
        "payload": row.get("payload") if isinstance(row.get("payload"), dict) else {},
        "createdBy": row.get("created_by"),
        "createdAt": row["created_at"].isoformat() if row.get("created_at") else None,
        "updatedAt": row["updated_at"].isoformat() if row.get("updated_at") else None,
        "visibleWorkspaceIds": visible_workspace_ids
        if visible_workspace_ids is not None
        else [],
    }


def _visibility_map(cur, opportunity_ids: list[Any]) -> dict[str, list[int]]:
    if not opportunity_ids:
        return {}
    cur.execute(
        f"""
        SELECT opportunity_id, workspace_id
        FROM {Tables.curated_opportunity_visibility}
        WHERE opportunity_id = ANY(%s)
        """,
        (list(opportunity_ids),),
    )
    out: dict[str, list[int]] = {}
    for row in cur.fetchall():
        key = str(row["opportunity_id"])
        out.setdefault(key, []).append(int(row["workspace_id"]))
    return out


def list_all(*, include_archived: bool = False) -> list[dict[str, Any]]:
    with connect_database() as conn:
        with conn.cursor() as cur:
            _ensure_tables(cur)
            if include_archived:
                cur.execute(
                    f"""
                    SELECT * FROM {Tables.curated_opportunities}
                    ORDER BY detected_at DESC, created_at DESC
                    """
                )
            else:
                cur.execute(
                    f"""
                    SELECT * FROM {Tables.curated_opportunities}
                    WHERE status = 'active'
                    ORDER BY detected_at DESC, created_at DESC
                    """
                )
            rows = [dict(r) for r in cur.fetchall()]
            vis = _visibility_map(cur, [r["id"] for r in rows])
            return [
                _row_to_dict(r, visible_workspace_ids=vis.get(str(r["id"]), []))
                for r in rows
            ]


def get_by_id(opportunity_id: str) -> dict[str, Any] | None:
    try:
        UUID(str(opportunity_id))
    except Exception:
        return None
    with connect_database() as conn:
        with conn.cursor() as cur:
            _ensure_tables(cur)
            cur.execute(
                f"SELECT * FROM {Tables.curated_opportunities} WHERE id = %s",
                (opportunity_id,),
            )
            row = cur.fetchone()
            if not row:
                return None
            data = dict(row)
            vis = _visibility_map(cur, [data["id"]])
            return _row_to_dict(data, visible_workspace_ids=vis.get(str(data["id"]), []))


def list_visible_for_workspace(
    *,
    workspace_id: int,
    category: str | None = None,
) -> list[dict[str, Any]]:
    with connect_database() as conn:
        with conn.cursor() as cur:
            _ensure_tables(cur)
            if category:
                cur.execute(
                    f"""
                    SELECT o.*
                    FROM {Tables.curated_opportunities} o
                    INNER JOIN {Tables.curated_opportunity_visibility} v
                      ON v.opportunity_id = o.id
                    WHERE v.workspace_id = %s
                      AND v.released_at IS NOT NULL
                      AND o.status = 'active'
                      AND o.category = %s
                    ORDER BY o.detected_at DESC, o.created_at DESC
                    """,
                    (workspace_id, category),
                )
            else:
                cur.execute(
                    f"""
                    SELECT o.*
                    FROM {Tables.curated_opportunities} o
                    INNER JOIN {Tables.curated_opportunity_visibility} v
                      ON v.opportunity_id = o.id
                    WHERE v.workspace_id = %s
                      AND v.released_at IS NOT NULL
                      AND o.status = 'active'
                    ORDER BY o.detected_at DESC, o.created_at DESC
                    """,
                    (workspace_id,),
                )
            rows = [dict(r) for r in cur.fetchall()]
            return [_row_to_dict(r, visible_workspace_ids=[workspace_id]) for r in rows]


def get_visible_for_workspace(
    *,
    workspace_id: int,
    opportunity_id: str,
) -> dict[str, Any] | None:
    raw_id = str(opportunity_id)
    if raw_id.startswith("curated:"):
        raw_id = raw_id.split(":", 1)[1]
    try:
        UUID(raw_id)
    except Exception:
        return None
    with connect_database() as conn:
        with conn.cursor() as cur:
            _ensure_tables(cur)
            cur.execute(
                f"""
                SELECT o.*
                FROM {Tables.curated_opportunities} o
                INNER JOIN {Tables.curated_opportunity_visibility} v
                  ON v.opportunity_id = o.id
                WHERE o.id = %s
                  AND v.workspace_id = %s
                  AND v.released_at IS NOT NULL
                  AND o.status = 'active'
                """,
                (raw_id, workspace_id),
            )
            row = cur.fetchone()
            if not row:
                return None
            return _row_to_dict(dict(row), visible_workspace_ids=[workspace_id])


def release_pending_for_workspace(*, workspace_id: int) -> int:
    """Mark queued curated rows as visible after a successful Radar run."""
    now = datetime.now(timezone.utc)
    with connect_database() as conn:
        with conn.cursor() as cur:
            _ensure_tables(cur)
            cur.execute(
                f"""
                UPDATE {Tables.curated_opportunity_visibility}
                SET released_at = %s
                WHERE workspace_id = %s
                  AND released_at IS NULL
                """,
                (now, int(workspace_id)),
            )
            return int(cur.rowcount or 0)


def create(
    *,
    fields: dict[str, Any],
    visible_workspace_ids: list[int],
    created_by: int | None,
) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    with transaction() as conn:
        with conn.cursor() as cur:
            _ensure_tables(cur)
            cur.execute(
                f"""
                INSERT INTO {Tables.curated_opportunities} (
                  category, opportunity_type, company, title, location,
                  engagement, duration, openings, experience,
                  skills, technologies, vendor_looking_for, partnership_model,
                  client_industry, candidate_requirement,
                  contact_name, contact_email, source, source_url,
                  priority, description, detected_at, status, payload,
                  created_by, created_at, updated_at
                ) VALUES (
                  %s, %s, %s, %s, %s,
                  %s, %s, %s, %s,
                  %s::jsonb, %s::jsonb, %s, %s,
                  %s, %s,
                  %s, %s, %s, %s,
                  %s, %s, %s, 'active', %s::jsonb,
                  %s, %s, %s
                )
                RETURNING *
                """,
                (
                    fields["category"],
                    fields["opportunity_type"],
                    fields.get("company") or "",
                    fields["title"],
                    fields.get("location") or "",
                    fields.get("engagement"),
                    fields.get("duration"),
                    fields.get("openings"),
                    fields.get("experience"),
                    json.dumps(fields.get("skills") or []),
                    json.dumps(fields.get("technologies") or []),
                    fields.get("vendor_looking_for"),
                    fields.get("partnership_model"),
                    fields.get("client_industry"),
                    fields.get("candidate_requirement"),
                    fields.get("contact_name"),
                    fields.get("contact_email"),
                    fields.get("source") or "LinkedIn",
                    fields.get("source_url"),
                    fields.get("priority") or "very_hot",
                    fields.get("description") or "",
                    fields.get("detected_at") or now,
                    json.dumps(fields.get("payload") or {}),
                    created_by,
                    now,
                    now,
                ),
            )
            row = dict(cur.fetchone())
            oid = row["id"]
            for wid in sorted(set(int(x) for x in visible_workspace_ids)):
                _insert_visibility_row(cur, opportunity_id=oid, workspace_id=wid)
            return _row_to_dict(
                row,
                visible_workspace_ids=sorted(set(int(x) for x in visible_workspace_ids)),
            )


def update(
    *,
    opportunity_id: str,
    fields: dict[str, Any],
    visible_workspace_ids: list[int] | None = None,
) -> dict[str, Any] | None:
    try:
        UUID(str(opportunity_id))
    except Exception:
        return None
    now = datetime.now(timezone.utc)
    with transaction() as conn:
        with conn.cursor() as cur:
            _ensure_tables(cur)
            cur.execute(
                f"""
                UPDATE {Tables.curated_opportunities}
                SET category = %s,
                    opportunity_type = %s,
                    company = %s,
                    title = %s,
                    location = %s,
                    engagement = %s,
                    duration = %s,
                    openings = %s,
                    experience = %s,
                    skills = %s::jsonb,
                    technologies = %s::jsonb,
                    vendor_looking_for = %s,
                    partnership_model = %s,
                    client_industry = %s,
                    candidate_requirement = %s,
                    contact_name = %s,
                    contact_email = %s,
                    source = %s,
                    source_url = %s,
                    priority = %s,
                    description = %s,
                    detected_at = %s,
                    payload = %s::jsonb,
                    updated_at = %s
                WHERE id = %s
                RETURNING *
                """,
                (
                    fields["category"],
                    fields["opportunity_type"],
                    fields.get("company") or "",
                    fields["title"],
                    fields.get("location") or "",
                    fields.get("engagement"),
                    fields.get("duration"),
                    fields.get("openings"),
                    fields.get("experience"),
                    json.dumps(fields.get("skills") or []),
                    json.dumps(fields.get("technologies") or []),
                    fields.get("vendor_looking_for"),
                    fields.get("partnership_model"),
                    fields.get("client_industry"),
                    fields.get("candidate_requirement"),
                    fields.get("contact_name"),
                    fields.get("contact_email"),
                    fields.get("source") or "LinkedIn",
                    fields.get("source_url"),
                    fields.get("priority") or "very_hot",
                    fields.get("description") or "",
                    fields.get("detected_at") or now,
                    json.dumps(fields.get("payload") or {}),
                    now,
                    opportunity_id,
                ),
            )
            row = cur.fetchone()
            if not row:
                return None
            data = dict(row)
            if visible_workspace_ids is not None:
                vis_ids = _sync_visibility(
                    cur,
                    opportunity_id=opportunity_id,
                    workspace_ids=visible_workspace_ids,
                )
            else:
                vis = _visibility_map(cur, [data["id"]])
                vis_ids = vis.get(str(data["id"]), [])
            return _row_to_dict(data, visible_workspace_ids=vis_ids)


def set_visibility(*, opportunity_id: str, workspace_ids: list[int]) -> dict[str, Any] | None:
    existing = get_by_id(opportunity_id)
    if not existing:
        return None
    with transaction() as conn:
        with conn.cursor() as cur:
            _ensure_tables(cur)
            _sync_visibility(
                cur,
                opportunity_id=opportunity_id,
                workspace_ids=workspace_ids,
            )
    return get_by_id(opportunity_id)


def archive(opportunity_id: str) -> dict[str, Any] | None:
    try:
        UUID(str(opportunity_id))
    except Exception:
        return None
    now = datetime.now(timezone.utc)
    with connect_database() as conn:
        with conn.cursor() as cur:
            _ensure_tables(cur)
            cur.execute(
                f"""
                UPDATE {Tables.curated_opportunities}
                SET status = 'archived', updated_at = %s
                WHERE id = %s
                RETURNING *
                """,
                (now, opportunity_id),
            )
            row = cur.fetchone()
            if not row:
                return None
            data = dict(row)
            vis = _visibility_map(cur, [data["id"]])
            return _row_to_dict(data, visible_workspace_ids=vis.get(str(data["id"]), []))
