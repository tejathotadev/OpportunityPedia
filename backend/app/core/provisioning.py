"""Plan labels and onboarding helpers.

Customer free vs paid is stored on `users.plan` and changed in Platform Admin —
not by editing this file per customer.

This module only defines shared constants and the wait→activate onboarding path
(used for free signup / invites; paid conversion is an admin plan flip).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

PLAN_FREE = "free"
PLAN_PAID = "paid"
ALLOWED_PLANS = frozenset({PLAN_FREE, PLAN_PAID})

# Both free and paid use the same set-password → workspace wait → admin activate
# pipeline when they are first provisioned. Upgrading free→paid later is only a
# plan field change on the existing user (same login).
PLAN_WORKSPACE_PROVISIONING: dict[str, bool] = {
    PLAN_FREE: True,
    PLAN_PAID: True,
}

# Total seats per workspace (owner counts as one). Free = owner + 1 teammate.
PLAN_SEAT_LIMITS: dict[str, int] = {
    PLAN_FREE: 2,
    PLAN_PAID: 5,
}

SEAT_ROLE_OWNER = "owner"
SEAT_ROLE_MEMBER = "member"
ALLOWED_SEAT_ROLES = frozenset({SEAT_ROLE_OWNER, SEAT_ROLE_MEMBER})

STATUS_PENDING_PASSWORD = "pending_password"
STATUS_PROVISIONING = "provisioning"
STATUS_ACTIVE = "active"
STATUS_PAID = "paid"  # legacy paid marker before password; still login-ready with active
STATUS_REMOVED = "removed"

# Free-plan access window from signup (or free plan assignment).
TRIAL_DAYS = 2

# After admin removes a trial user, hard-delete their row (and cascaded data)
# once this many days have passed.
TRIAL_PURGE_DAYS = 2

TRIAL_ENDED_DETAIL = (
    "Your 2-day free trial has ended. Contact support to upgrade to a paid plan."
)

PASSWORD_SETUP_STATUSES = frozenset(
    {
        STATUS_PENDING_PASSWORD,
        "pending",
        STATUS_PAID,
        STATUS_PROVISIONING,
        STATUS_ACTIVE,
    }
)

LOGIN_READY_STATUSES = frozenset({STATUS_ACTIVE, STATUS_PAID})


def seat_limit_for_plan(plan: str | None) -> int:
    key = (plan or PLAN_FREE).strip().lower() or PLAN_FREE
    return int(PLAN_SEAT_LIMITS.get(key, PLAN_SEAT_LIMITS[PLAN_FREE]))


def uses_workspace_provisioning(plan: str | None, *, seat_role: str | None = None) -> bool:
    """True when this plan must wait for admin activate after password.

    Workspace members skip the wait — they inherit the owner's ready workspace.
    """
    if (seat_role or SEAT_ROLE_OWNER).strip().lower() == SEAT_ROLE_MEMBER:
        return False
    key = (plan or PLAN_FREE).strip().lower() or PLAN_FREE
    return bool(PLAN_WORKSPACE_PROVISIONING.get(key, False))


def post_password_status(*, plan: str | None, seat_role: str | None = None) -> str:
    """Status written right after the customer sets their password."""
    if uses_workspace_provisioning(plan, seat_role=seat_role):
        return STATUS_PROVISIONING
    return STATUS_ACTIVE


def post_password_next(*, plan: str | None, seat_role: str | None = None) -> str:
    """Frontend route hint after set-password."""
    if uses_workspace_provisioning(plan, seat_role=seat_role):
        return "workspace_setup"
    return "login"


def _as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def trial_end_from_now() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=TRIAL_DAYS)


def free_trial_applies(owner: dict | None) -> bool:
    """True when this workspace is on a timed free trial (not paid / demo)."""
    if not owner:
        return False
    if bool(owner.get("is_demo")):
        return False
    plan = (owner.get("plan") or PLAN_FREE).strip().lower() or PLAN_FREE
    return plan == PLAN_FREE


def trial_is_expired(owner: dict | None, *, now: datetime | None = None) -> bool:
    """True when free trial has ended and access should be locked."""
    if not free_trial_applies(owner):
        return False
    ends = _as_utc(owner.get("trial_ends_at") if owner else None)
    if ends is None:
        # Missing clock on free plan: treat as expired so access cannot drift open.
        return True
    clock = now or datetime.now(timezone.utc)
    if clock.tzinfo is None:
        clock = clock.replace(tzinfo=timezone.utc)
    return clock >= ends


def trial_seconds_remaining(owner: dict | None, *, now: datetime | None = None) -> int | None:
    """Seconds until trial end; 0 if ended; None if no trial clock (paid/demo)."""
    if not free_trial_applies(owner):
        return None
    ends = _as_utc(owner.get("trial_ends_at") if owner else None)
    if ends is None:
        return 0
    clock = now or datetime.now(timezone.utc)
    if clock.tzinfo is None:
        clock = clock.replace(tzinfo=timezone.utc)
    return max(0, int((ends - clock).total_seconds()))

