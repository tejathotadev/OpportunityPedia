"""Read endpoints backing the OP frontend.

Paths and payload shapes mirror the `!USE_MOCKS` branches in OP's
`src/services/*.ts`, so flipping `VITE_USE_MOCKS=false` is the only change the
frontend needs.

Notes and saved views have no tables yet; those routes answer 501 rather than
pretending the write succeeded.
"""

from typing import Any

from fastapi import BackgroundTasks, Body, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse

from app.api.deps import current_actor_id, current_user_id
from app.services import op_service, radar_service

_NOT_IMPLEMENTED = "Saved views are not wired to storage yet."


def _unavailable() -> None:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED, detail=_NOT_IMPLEMENTED
    )


def _limit(request: Request, default: int) -> int:
    raw = request.query_params.get("limit")
    try:
        return max(1, min(int(raw), 200)) if raw else default
    except (TypeError, ValueError):
        return default


# ------------------------------------------------------------ opportunities


def list_opportunities(request: Request, user_id: int = Depends(current_user_id)):
    return op_service.list_opportunities(user_id=user_id, params=request.query_params)


def list_shared_opportunities(request: Request, user_id: int = Depends(current_user_id)):
    return op_service.list_shared_opportunities(user_id=user_id, params=request.query_params)


def list_opportunity_companies(request: Request, user_id: int = Depends(current_user_id)):
    return op_service.list_opportunity_companies(user_id=user_id, params=request.query_params)


def company_hiring_signal(company_id: str, request: Request, user_id: int = Depends(current_user_id)):
    found = op_service.company_hiring_signal(
        user_id=user_id,
        company_id=company_id,
        teams=request.query_params.getlist("team") or request.query_params.getlist("team[]"),
        locations=request.query_params.getlist("location")
        or request.query_params.getlist("location[]"),
        flexibilities=request.query_params.getlist("flexibility")
        or request.query_params.getlist("flexibility[]"),
    )
    if not found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Company hiring signal not found"
        )
    return found


def get_opportunity(opportunity_id: str, user_id: int = Depends(current_user_id)):
    found = op_service.get_opportunity(user_id=user_id, opportunity_id=opportunity_id)
    if not found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Opportunity not found"
        )
    return found


def open_opportunity_source(opportunity_id: str, user_id: int = Depends(current_user_id)):
    """Redirects to the original posting.

    The upstream URL names the collector in its domain, so it is resolved here
    instead of being handed to the client, which only ever sees this path.
    """
    url = op_service.source_url_for(user_id=user_id, opportunity_id=opportunity_id)
    if not url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No source link for this opportunity"
        )
    return RedirectResponse(url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)


def opportunity_activity(opportunity_id: str, user_id: int = Depends(current_user_id)):
    return op_service.opportunity_activity(
        user_id=user_id, opportunity_id=opportunity_id
    )


def opportunity_outreach(opportunity_id: str, user_id: int = Depends(current_user_id)):
    return op_service.outreach_for_opportunity(
        user_id=user_id, opportunity_id=opportunity_id
    )


def opportunity_assignments(opportunity_id: str, user_id: int = Depends(current_user_id)):
    return op_service.list_assignments(user_id=user_id, opportunity_id=opportunity_id)


def assign_opportunity(
    opportunity_id: str,
    user_id: int = Depends(current_user_id),
    actor_id: int = Depends(current_actor_id),
    body: dict[str, Any] | None = Body(default=None),
):
    """Assign to the actor, or to a workspace teammate when `userId` is sent."""
    assignee_id: int | None = None
    raw = (body or {}).get("userId")
    if raw is not None and str(raw).strip() != "":
        try:
            assignee_id = int(raw)
        except (TypeError, ValueError):
            assignee_id = None
    return op_service.assign_opportunity(
        user_id=user_id,
        actor_id=actor_id,
        opportunity_id=opportunity_id,
        assignee_id=assignee_id,
    )


def unassign_opportunity(
    opportunity_id: str,
    user_id: int = Depends(current_user_id),
    actor_id: int = Depends(current_actor_id),
):
    return op_service.unassign(
        user_id=user_id, actor_id=actor_id, opportunity_id=opportunity_id
    )


def opportunity_write(opportunity_id: str, user_id: int = Depends(current_user_id)):
    """Save / note / follow-up — pending their own tables."""
    _unavailable()


# ------------------------------------------------------------------ vendors


def list_vendors(request: Request, user_id: int = Depends(current_user_id)):
    return op_service.list_vendors(user_id=user_id, params=request.query_params)


def get_vendor(vendor_id: str, user_id: int = Depends(current_user_id)):
    found = op_service.get_vendor(user_id=user_id, vendor_id=vendor_id)
    if not found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found"
        )
    return found


# ---------------------------------------------------------------- dashboard


def dashboard_metrics(
    request: Request,
    user_id: int = Depends(current_user_id),
    actor_id: int = Depends(current_actor_id),
):
    return op_service.dashboard_metrics(
        user_id=user_id,
        actor_id=actor_id,
        **op_service.scope_from_params(request.query_params),
    )


def dashboard_overview(
    request: Request,
    user_id: int = Depends(current_user_id),
    actor_id: int = Depends(current_actor_id),
):
    """Bundled Overview payload — one auth + one job rebuild for four widgets."""

    def _named_limit(key: str, default: int) -> int:
        raw = request.query_params.get(key)
        try:
            return max(1, min(int(raw), 200)) if raw else default
        except (TypeError, ValueError):
            return default

    return op_service.dashboard_overview(
        user_id=user_id,
        actor_id=actor_id,
        attention_limit=_named_limit("attention_limit", 8),
        deadlines_limit=_named_limit("deadlines_limit", 5),
        **op_service.scope_from_params(request.query_params),
    )


def dashboard_pipeline(
    user_id: int = Depends(current_user_id),
    actor_id: int = Depends(current_actor_id),
):
    return op_service.pipeline_summary(user_id=user_id, actor_id=actor_id)


def dashboard_needs_attention(request: Request, user_id: int = Depends(current_user_id)):
    return op_service.needs_attention(
        user_id=user_id,
        limit=_limit(request, 8),
        **op_service.scope_from_params(request.query_params),
    )


def dashboard_deadlines(request: Request, user_id: int = Depends(current_user_id)):
    return op_service.upcoming_deadlines(
        user_id=user_id,
        limit=_limit(request, 6),
        **op_service.scope_from_params(request.query_params),
    )


# -------------------------------------------------------------------- misc


def list_activity(request: Request, user_id: int = Depends(current_user_id)):
    types = request.query_params.getlist("type") or request.query_params.getlist("type[]")
    return op_service.team_activity(
        user_id=user_id, limit=_limit(request, 20), types=types or None
    )


def my_assignments(
    user_id: int = Depends(current_user_id),
    actor_id: int = Depends(current_actor_id),
):
    return op_service.my_assignments(user_id=user_id, actor_id=actor_id)


def team_ownership(user_id: int = Depends(current_user_id)):
    return op_service.team_ownership(user_id=user_id)


def list_notifications(actor_id: int = Depends(current_actor_id)):
    return op_service.notifications(actor_id=actor_id)


def notification_read(notification_id: str, actor_id: int = Depends(current_actor_id)):
    return op_service.notification_mark_read(
        actor_id=actor_id, notification_id=notification_id
    )


def notifications_read_all(actor_id: int = Depends(current_actor_id)):
    return op_service.notifications_mark_all_read(actor_id=actor_id)


def list_saved_views(user_id: int = Depends(current_user_id)):
    return op_service.saved_views(user_id=user_id)


def create_saved_view(user_id: int = Depends(current_user_id)):
    _unavailable()


def delete_saved_view(view_id: str, user_id: int = Depends(current_user_id)):
    _unavailable()


def send_outreach(
    payload: dict[str, Any] = Body(...),
    user_id: int = Depends(current_user_id),
    actor_id: int = Depends(current_actor_id),
):
    return op_service.send_outreach(user_id=user_id, actor_id=actor_id, payload=payload)


def search(request: Request, user_id: int = Depends(current_user_id)):
    return op_service.global_search(
        user_id=user_id, term=request.query_params.get("q") or ""
    )


# ------------------------------------------------------------------- radar


def radar_status(user_id: int = Depends(current_user_id)):
    return radar_service.radar_status(user_id=user_id)


def list_radar_runs(user_id: int = Depends(current_user_id)):
    return radar_service.list_radar_runs(user_id=user_id)


def trigger_radar_run(
    background: BackgroundTasks,
    response: Response,
    user_id: int = Depends(current_user_id),
):
    """Queues a scan and answers straight away.

    A scan takes about a minute per NAICS code, which is longer than the read
    timeouts of proxies between the browser and this service, so waiting for
    it would report failures for runs that actually succeeded. The reserved
    run row already blocks a second scan, and `/radar/status` reports progress
    and the final counts, so the client loses nothing by not waiting.
    """
    started = radar_service.start_radar_run(user_id=user_id)
    background.add_task(
        radar_service.execute_radar_run, user_id=user_id, run_id=started["runId"]
    )
    response.status_code = status.HTTP_202_ACCEPTED
    return {"accepted": True, "cooldown": started["cooldown"]}
