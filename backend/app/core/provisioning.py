"""Plan labels and onboarding helpers.

Customer free vs paid is stored on `users.plan` and changed in Platform Admin —
not by editing this file per customer.

This module only defines shared constants and the wait→activate onboarding path
(used for free signup / invites; paid conversion is an admin plan flip).
"""

from __future__ import annotations

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

# After admin removes a trial user, hard-delete their row (and cascaded data)
# once this many days have passed.
TRIAL_PURGE_DAYS = 2

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
