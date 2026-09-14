from __future__ import annotations

from typing import Any

from app.core.provisioning import (
    PLAN_FREE,
    SEAT_ROLE_MEMBER,
    SEAT_ROLE_OWNER,
    STATUS_PENDING_PASSWORD,
)
from app.db.connection import connect_database
from app.db.schema import Tables


def _select_cols() -> str:
    return (
        "id, role, name, email, phone, company, password_hash, status, "
        "plan, gov_api_key, is_demo, last_login_at, created_at, updated_at, "
        "removed_at, workspace_id, seat_role, session_version"
    )


def _claim_workspace(cur, user_id: int) -> None:
    """Owner's workspace_id points at themselves."""
    cur.execute(
        f"""
        UPDATE {Tables.users}
        SET workspace_id = %s, seat_role = %s
        WHERE id = %s AND role = 'customer'
        """,
        (user_id, SEAT_ROLE_OWNER, user_id),
    )


def find_by_email(email: str) -> dict[str, Any] | None:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT {_select_cols()}
                FROM {Tables.users}
                WHERE lower(email::text) = lower(%s)
                LIMIT 1
                """,
                (email.strip(),),
            )
            return cur.fetchone()


def find_by_id(user_id: int) -> dict[str, Any] | None:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT {_select_cols()}
                FROM {Tables.users}
                WHERE id = %s
                LIMIT 1
                """,
                (user_id,),
            )
            return cur.fetchone()


def insert_admin(*, name: str, email: str, password_hash: str) -> int:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                INSERT INTO {Tables.users}
                    (role, name, email, phone, company, password_hash, status, plan, is_demo)
                VALUES ('platform_admin', %s, %s, '', NULL, %s, 'active', 'free', FALSE)
                RETURNING id
                """,
                (name.strip(), email.strip().lower(), password_hash),
            )
            row = cur.fetchone()
            return int(row["id"])


def insert_customer(*, name: str, email: str, phone: str, company: str | None) -> int:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                INSERT INTO {Tables.users}
                    (role, name, email, phone, company, password_hash, status, plan,
                     is_demo, seat_role)
                VALUES ('customer', %s, %s, %s, %s, NULL, 'pending', %s, FALSE, %s)
                RETURNING id
                """,
                (
                    name.strip(),
                    email.strip().lower(),
                    phone.strip(),
                    (company or "").strip() or None,
                    PLAN_FREE,
                    SEAT_ROLE_OWNER,
                ),
            )
            row = cur.fetchone()
            user_id = int(row["id"])
            _claim_workspace(cur, user_id)
            return user_id


def insert_invited_customer(
    *,
    name: str,
    email: str,
    phone: str,
    company: str | None,
    plan: str = PLAN_FREE,
) -> int:
    """Create a workspace owner awaiting set-password email (not login-ready yet)."""
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                INSERT INTO {Tables.users}
                    (role, name, email, phone, company, password_hash, status, plan,
                     is_demo, seat_role)
                VALUES ('customer', %s, %s, %s, %s, NULL, %s, %s, FALSE, %s)
                RETURNING id
                """,
                (
                    name.strip(),
                    email.strip().lower(),
                    (phone or "").strip(),
                    (company or "").strip() or None,
                    STATUS_PENDING_PASSWORD,
                    (plan or PLAN_FREE).strip().lower() or PLAN_FREE,
                    SEAT_ROLE_OWNER,
                ),
            )
            row = cur.fetchone()
            user_id = int(row["id"])
            _claim_workspace(cur, user_id)
            return user_id


def insert_workspace_member(
    *,
    workspace_id: int,
    name: str,
    email: str,
    phone: str = "",
    company: str | None = None,
    plan: str = PLAN_FREE,
) -> int:
    """Create a teammate seat under an existing owner workspace."""
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                INSERT INTO {Tables.users}
                    (role, name, email, phone, company, password_hash, status, plan,
                     is_demo, workspace_id, seat_role)
                VALUES ('customer', %s, %s, %s, %s, NULL, %s, %s, FALSE, %s, %s)
                RETURNING id
                """,
                (
                    name.strip(),
                    email.strip().lower(),
                    (phone or "").strip(),
                    (company or "").strip() or None,
                    STATUS_PENDING_PASSWORD,
                    (plan or PLAN_FREE).strip().lower() or PLAN_FREE,
                    workspace_id,
                    SEAT_ROLE_MEMBER,
                ),
            )
            row = cur.fetchone()
            return int(row["id"])


def insert_active_customer(
    *,
    name: str,
    email: str,
    phone: str,
    company: str | None,
    password_hash: str | None = None,
) -> int:
    """Legacy helper — prefer insert_invited_customer for invites."""
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                INSERT INTO {Tables.users}
                    (role, name, email, phone, company, password_hash, status, plan,
                     is_demo, seat_role)
                VALUES ('customer', %s, %s, %s, %s, %s, 'active', %s, FALSE, %s)
                RETURNING id
                """,
                (
                    name.strip(),
                    email.strip().lower(),
                    (phone or "").strip(),
                    (company or "").strip() or None,
                    password_hash,
                    PLAN_FREE,
                    SEAT_ROLE_OWNER,
                ),
            )
            row = cur.fetchone()
            user_id = int(row["id"])
            _claim_workspace(cur, user_id)
            return user_id


def upsert_seed_user(
    *,
    email: str,
    password_hash: str,
    name: str,
    company: str | None,
    role: str,
    status: str,
    is_demo: bool = False,
) -> int:
    existing = find_by_email(email)
    if existing:
        with connect_database() as conn:
            with conn.cursor() as cur:
                    cur.execute(
                    f"""
                    UPDATE {Tables.users}
                    SET name = %s,
                        company = %s,
                        password_hash = %s,
                        role = %s,
                        status = %s,
                        is_demo = %s
                    WHERE id = %s
                    """,
                    (
                        name.strip(),
                        (company or "").strip() or None,
                        password_hash,
                        role,
                        status,
                        is_demo,
                        int(existing["id"]),
                    ),
                )
        if role == "customer":
            with connect_database() as conn:
                with conn.cursor() as cur:
                            _claim_workspace(cur, int(existing["id"]))
        return int(existing["id"])

    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                INSERT INTO {Tables.users}
                    (role, name, email, phone, company, password_hash, status, plan,
                     is_demo, seat_role)
                VALUES (%s, %s, %s, '', %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    role,
                    name.strip(),
                    email.strip().lower(),
                    (company or "").strip() or None,
                    password_hash,
                    status,
                    PLAN_FREE,
                    is_demo,
                    SEAT_ROLE_OWNER if role == "customer" else SEAT_ROLE_OWNER,
                ),
            )
            row = cur.fetchone()
            user_id = int(row["id"])
            if role == "customer":
                _claim_workspace(cur, user_id)
            return user_id


def update_customer_profile(
    *,
    user_id: int,
    name: str,
    phone: str,
    company: str | None,
) -> None:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE {Tables.users}
                SET name = %s, phone = %s, company = %s
                WHERE id = %s AND role = 'customer'
                """,
                (name.strip(), phone.strip(), (company or "").strip() or None, user_id),
            )


def list_customers(*, limit: int = 200) -> list[dict[str, Any]]:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, name, email, phone, company, status, plan,
                       (gov_api_key IS NOT NULL AND length(trim(gov_api_key)) > 0) AS has_gov_api_key,
                       is_demo, last_login_at, created_at, removed_at,
                       workspace_id, seat_role
                FROM {Tables.users}
                WHERE role = 'customer'
                  AND COALESCE(seat_role, 'owner') = 'owner'
                ORDER BY
                  CASE status
                    WHEN 'provisioning' THEN 0
                    WHEN 'pending_password' THEN 1
                    WHEN 'removed' THEN 3
                    ELSE 2
                  END,
                  created_at DESC
                LIMIT %s
                """,
                (limit,),
            )
            return list(cur.fetchall())


def list_provisioning_customers(*, limit: int = 200) -> list[dict[str, Any]]:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, name, email, phone, company, status, plan,
                       (gov_api_key IS NOT NULL AND length(trim(gov_api_key)) > 0) AS has_gov_api_key,
                       is_demo, last_login_at, created_at, workspace_id, seat_role
                FROM {Tables.users}
                WHERE role = 'customer'
                  AND status = 'provisioning'
                  AND COALESCE(seat_role, 'owner') = 'owner'
                ORDER BY created_at ASC
                LIMIT %s
                """,
                (limit,),
            )
            return list(cur.fetchall())


def list_workspace_members(workspace_id: int) -> list[dict[str, Any]]:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, name, email, phone, company, status, plan, seat_role,
                       workspace_id, last_login_at, created_at
                FROM {Tables.users}
                WHERE role = 'customer'
                  AND workspace_id = %s
                  AND status <> 'removed'
                ORDER BY
                  CASE COALESCE(seat_role, 'owner')
                    WHEN 'owner' THEN 0
                    ELSE 1
                  END,
                  created_at ASC
                """,
                (workspace_id,),
            )
            return list(cur.fetchall())


def count_workspace_seats(workspace_id: int) -> int:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT COUNT(*)::int AS n
                FROM {Tables.users}
                WHERE role = 'customer'
                  AND workspace_id = %s
                  AND status <> 'removed'
                """,
                (workspace_id,),
            )
            row = cur.fetchone()
            return int(row["n"] if row else 0)


def list_member_ids_for_workspace(workspace_id: int) -> list[int]:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id
                FROM {Tables.users}
                WHERE role = 'customer'
                  AND workspace_id = %s
                  AND COALESCE(seat_role, 'owner') = %s
                """,
                (workspace_id, SEAT_ROLE_MEMBER),
            )
            return [int(row["id"]) for row in cur.fetchall()]


def resolve_workspace_id(user: dict[str, Any] | None) -> int | None:
    if not user:
        return None
    wid = user.get("workspace_id")
    if wid is not None:
        return int(wid)
    return int(user["id"]) if user.get("id") is not None else None


def set_customer_status(user_id: int, status: str) -> None:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE {Tables.users}
                SET status = %s
                WHERE id = %s AND role = 'customer'
                """,
                (status, user_id),
            )


def set_customer_plan(user_id: int, plan: str) -> None:
    """Flip plan on the owner and mirror onto active seats for display."""
    with connect_database() as conn:
        with conn.cursor() as cur:
            plan_clean = plan.strip().lower()
            cur.execute(
                f"""
                SELECT id, workspace_id, seat_role
                FROM {Tables.users}
                WHERE id = %s AND role = 'customer'
                """,
                (user_id,),
            )
            row = cur.fetchone()
            if not row:
                return
            seat = (row.get("seat_role") or SEAT_ROLE_OWNER).strip().lower()
            if seat != SEAT_ROLE_OWNER:
                return
            workspace_id = int(row.get("workspace_id") or row["id"])
            cur.execute(
                f"""
                UPDATE {Tables.users}
                SET plan = %s
                WHERE role = 'customer'
                  AND workspace_id = %s
                  AND status <> 'removed'
                """,
                (plan_clean, workspace_id),
            )


def mark_customer_removed(user_id: int) -> None:
    """Soft-remove owner (and their seats) or a single seat member."""
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, workspace_id, seat_role
                FROM {Tables.users}
                WHERE id = %s AND role = 'customer' AND COALESCE(is_demo, FALSE) = FALSE
                """,
                (user_id,),
            )
            row = cur.fetchone()
            if not row:
                return
            seat = (row.get("seat_role") or SEAT_ROLE_OWNER).strip().lower()
            if seat == SEAT_ROLE_OWNER:
                workspace_id = int(row.get("workspace_id") or row["id"])
                cur.execute(
                    f"""
                    UPDATE {Tables.users}
                    SET status = 'removed',
                        removed_at = NOW(),
                        gov_api_key = NULL
                    WHERE role = 'customer'
                      AND workspace_id = %s
                      AND COALESCE(is_demo, FALSE) = FALSE
                    """,
                    (workspace_id,),
                )
            else:
                cur.execute(
                    f"""
                    UPDATE {Tables.users}
                    SET status = 'removed',
                        removed_at = NOW(),
                        gov_api_key = NULL
                    WHERE id = %s AND role = 'customer' AND COALESCE(is_demo, FALSE) = FALSE
                    """,
                    (user_id,),
                )


def restore_customer(user_id: int) -> None:
    """Undo soft-remove before purge (keeps plan; returns to active if password set).

    Restoring an owner also restores teammate seats removed with them.
    """
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, workspace_id, seat_role
                FROM {Tables.users}
                WHERE id = %s AND role = 'customer' AND status = 'removed'
                """,
                (user_id,),
            )
            row = cur.fetchone()
            if not row:
                return
            seat = (row.get("seat_role") or SEAT_ROLE_OWNER).strip().lower()
            if seat == SEAT_ROLE_OWNER:
                workspace_id = int(row.get("workspace_id") or row["id"])
                cur.execute(
                    f"""
                    UPDATE {Tables.users}
                    SET status = CASE
                          WHEN password_hash IS NULL THEN 'pending_password'
                          WHEN COALESCE(seat_role, 'owner') = 'member' THEN 'active'
                          ELSE 'active'
                        END,
                        removed_at = NULL
                    WHERE role = 'customer'
                      AND workspace_id = %s
                      AND status = 'removed'
                    """,
                    (workspace_id,),
                )
            else:
                cur.execute(
                    f"""
                    UPDATE {Tables.users}
                    SET status = CASE
                          WHEN password_hash IS NULL THEN 'pending_password'
                          ELSE 'active'
                        END,
                        removed_at = NULL
                    WHERE id = %s AND role = 'customer' AND status = 'removed'
                    """,
                    (user_id,),
                )


def list_due_for_purge(*, purge_days: int) -> list[dict[str, Any]]:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, email, name
                FROM {Tables.users}
                WHERE role = 'customer'
                  AND status = 'removed'
                  AND COALESCE(seat_role, 'owner') = 'owner'
                  AND removed_at IS NOT NULL
                  AND removed_at <= NOW() - (%s * INTERVAL '1 day')
                  AND COALESCE(is_demo, FALSE) = FALSE
                ORDER BY removed_at ASC
                """,
                (int(purge_days),),
            )
            return list(cur.fetchall())


def _delete_user_related(cur, user_id: int) -> None:
    for table in (
        Tables.password_tokens,
        Tables.payments,
        Tables.user_naics_codes,
        Tables.radar_runs,
        Tables.radar_jobs,
        Tables.radar_vendors,
        Tables.opportunity_details,
        Tables.company_hiring_signals,
        Tables.outreach_messages,
        Tables.opportunity_activities,
        Tables.opportunity_assignments,
    ):
        try:
            cur.execute("SAVEPOINT purge_row")
            cur.execute(f"DELETE FROM {table} WHERE user_id = %s", (user_id,))
            cur.execute("RELEASE SAVEPOINT purge_row")
        except Exception:
            cur.execute("ROLLBACK TO SAVEPOINT purge_row")


def hard_delete_customer(user_id: int) -> None:
    """Permanent delete — wipe related rows then the user (demo protected).

    Deleting a workspace owner also deletes teammate seat rows first.
    """
    from app.db.connection import transaction

    with transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, workspace_id, seat_role
                FROM {Tables.users}
                WHERE id = %s AND role = 'customer' AND COALESCE(is_demo, FALSE) = FALSE
                """,
                (user_id,),
            )
            row = cur.fetchone()
            if row is None:
                return

            seat = (row.get("seat_role") or SEAT_ROLE_OWNER).strip().lower()
            ids_to_delete = [int(row["id"])]
            if seat == SEAT_ROLE_OWNER:
                workspace_id = int(row.get("workspace_id") or row["id"])
                cur.execute(
                    f"""
                    SELECT id FROM {Tables.users}
                    WHERE role = 'customer'
                      AND workspace_id = %s
                      AND id <> %s
                      AND COALESCE(is_demo, FALSE) = FALSE
                    """,
                    (workspace_id, user_id),
                )
                ids_to_delete.extend(int(r["id"]) for r in cur.fetchall())

            for uid in ids_to_delete:
                _delete_user_related(cur, uid)
                cur.execute(
                    f"""
                    DELETE FROM {Tables.users}
                    WHERE id = %s AND role = 'customer' AND COALESCE(is_demo, FALSE) = FALSE
                    """,
                    (uid,),
                )


def set_gov_api_key(user_id: int, api_key: str | None) -> None:
    """Store the admin-provisioned government source key (internal only)."""
    cleaned = (api_key or "").strip() or None
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE {Tables.users}
                SET gov_api_key = %s
                WHERE id = %s AND role = 'customer'
                """,
                (cleaned, user_id),
            )


def get_gov_api_key(user_id: int) -> str | None:
    user = find_by_id(user_id)
    if not user:
        return None
    key = (user.get("gov_api_key") or "").strip()
    return key or None


def update_admin_credentials(*, email: str, name: str, password_hash: str) -> None:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE {Tables.users}
                SET name = %s, password_hash = %s, role = 'platform_admin',
                    status = 'active', is_demo = FALSE
                WHERE lower(email::text) = lower(%s)
                """,
                (name.strip(), password_hash, email.strip()),
            )


def set_password_hash(user_id: int, password_hash: str, *, status: str) -> None:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE {Tables.users}
                SET password_hash = %s, status = %s
                WHERE id = %s AND role = 'customer'
                """,
                (password_hash, status, user_id),
            )


def set_password_and_consume_token(
    *,
    user_id: int,
    password_hash: str,
    status: str,
    token_id: int,
) -> None:
    """Set password + mark the setup token used in one transaction."""
    from app.db.connection import transaction
    from app.repositories import token_repository

    with transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE {Tables.users}
                SET password_hash = %s, status = %s
                WHERE id = %s AND role = 'customer'
                """,
                (password_hash, status, user_id),
            )
        token_repository.mark_used(token_id, conn=conn)


def activate_customer(*, user_id: int, gov_api_key: str | None = None) -> None:
    """Admin confirms workspace ready — optional source key, then active."""
    with connect_database() as conn:
        with conn.cursor() as cur:
            cleaned = (gov_api_key or "").strip() or None
            if cleaned is not None:
                cur.execute(
                    f"""
                    UPDATE {Tables.users}
                    SET status = 'active', gov_api_key = %s
                    WHERE id = %s AND role = 'customer'
                    """,
                    (cleaned, user_id),
                )
            else:
                cur.execute(
                    f"""
                    UPDATE {Tables.users}
                    SET status = 'active'
                    WHERE id = %s AND role = 'customer'
                    """,
                    (user_id,),
                )


def touch_last_login(user_id: int) -> None:
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE {Tables.users}
                SET last_login_at = NOW()
                WHERE id = %s
                """,
                (user_id,),
            )


def bump_session_version(user_id: int) -> int:
    """Invalidate every prior JWT for this user; return the new session version."""
    with connect_database() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE {Tables.users}
                SET session_version = COALESCE(session_version, 1) + 1,
                    last_login_at = NOW()
                WHERE id = %s
                RETURNING session_version
                """,
                (user_id,),
            )
            row = cur.fetchone()
            return int(row["session_version"] if row else 1)
