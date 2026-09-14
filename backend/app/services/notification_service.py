from __future__ import annotations

from typing import Any

from app.core.provisioning import LOGIN_READY_STATUSES
from app.repositories import notification_repository, user_repository

MAX_RADAR_ITEM_NOTIFICATIONS = 15


def list_for_actor(*, actor_user_id: int) -> dict[str, Any]:
    items = notification_repository.list_for_user(user_id=actor_user_id)
    return {"items": items}


def mark_read(*, actor_user_id: int, notification_id: str) -> dict[str, Any]:
    notification_repository.mark_read(user_id=actor_user_id, notification_id=notification_id)
    return {"ok": True}


def mark_all_read(*, actor_user_id: int) -> dict[str, Any]:
    count = notification_repository.mark_all_read(user_id=actor_user_id)
    return {"ok": True, "count": count}


def _active_workspace_member_ids(workspace_id: int) -> list[int]:
    members = user_repository.list_workspace_members(workspace_id)
    ids: list[int] = []
    for member in members:
        if member.get("status") not in LOGIN_READY_STATUSES:
            continue
        ids.append(int(member["id"]))
    return ids or [workspace_id]


def fan_out_radar_run(
    *,
    workspace_id: int,
    status: str,
    new_count: int,
    new_items: list[dict[str, Any]] | None,
) -> None:
    """Create inbox rows for every active workspace member."""
    user_ids = _active_workspace_member_ids(workspace_id)
    rows: list[dict[str, Any]] = []

    if status != "ok":
        title = "Radar scan failed"
        description = "No sources answered. Try again from Overview."
        for uid in user_ids:
            rows.append(
                {
                    "user_id": uid,
                    "workspace_id": workspace_id,
                    "type": "system",
                    "title": title,
                    "description": description,
                    "action": "radar_runs",
                }
            )
        notification_repository.insert_many(rows)
        return

    if new_count <= 0:
        return

    summary_title = f"{new_count} new {'update' if new_count == 1 else 'updates'} from Radar"
    summary_desc = "Open Radar runs to review everything from the latest scan."
    for uid in user_ids:
        rows.append(
            {
                "user_id": uid,
                "workspace_id": workspace_id,
                "type": "system",
                "title": summary_title,
                "description": summary_desc,
                "action": "radar_runs",
            }
        )

    items = list(new_items or [])[:MAX_RADAR_ITEM_NOTIFICATIONS]
    for item in items:
        ext_id = str(item.get("externalJobId") or "").strip()
        if not ext_id:
            continue
        title = (item.get("title") or "New opportunity").strip() or "New opportunity"
        company = (item.get("boardName") or "Company").strip()
        naics = item.get("naics")
        desc = company
        if naics:
            desc = f"{company} · NAICS {naics}"
        for uid in user_ids:
            rows.append(
                {
                    "user_id": uid,
                    "workspace_id": workspace_id,
                    "type": "system",
                    "title": title,
                    "description": desc,
                    "opportunity_id": ext_id,
                }
            )

    remaining = new_count - len(items)
    if remaining > 0:
        extra = f"+ {remaining} more in Radar runs"
        for uid in user_ids:
            rows.append(
                {
                    "user_id": uid,
                    "workspace_id": workspace_id,
                    "type": "system",
                    "title": "More Radar updates",
                    "description": extra,
                    "action": "radar_runs",
                }
            )

    notification_repository.insert_many(rows)
