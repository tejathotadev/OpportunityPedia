from fastapi import APIRouter

from app.api.routes import Routes
from app.controllers.access_controller import create_access_request, signup_free
from app.controllers.admin_controller import (
    activate_user,
    create_user,
    get_user_naics,
    list_leads,
    list_naics_catalog,
    list_payments,
    list_user_radar_runs,
    list_users,
    remove_user,
    restore_user,
    set_user_naics,
    set_user_plan,
    update_lead,
)
from app.controllers.curated_controller import (
    archive_curated_opportunity,
    create_curated_opportunity,
    get_curated_opportunity,
    list_curated_opportunities,
    set_curated_visibility,
    update_curated_opportunity,
)
from app.controllers.ai_outreach_controller import (
    admin_test_gemini,
    generate_outreach_ai_draft,
)
from app.controllers.workspace_controller import invite_member, list_team, remove_member
from app.controllers.auth_controller import (
    customer_login,
    customer_me,
    login,
    me,
    provisioning_status,
    resend_setup,
    set_password,
    update_customer_profile,
)
from app.controllers.contact_controller import submit_contact
from app.controllers import op_controller
from app.controllers.radar_controller import latest_results
from app.controllers.razorpay_controller import create_order, verify_payment

api_router = APIRouter()
api_router.add_api_route(Routes.ADMIN_LOGIN, login, methods=["POST"])
api_router.add_api_route(Routes.ADMIN_ME, me, methods=["GET"])
api_router.add_api_route(Routes.ADMIN_USERS, list_users, methods=["GET"])
api_router.add_api_route(Routes.ADMIN_USERS, create_user, methods=["POST"])
api_router.add_api_route(Routes.ADMIN_USER_ACTIVATE, activate_user, methods=["POST"])
api_router.add_api_route(Routes.ADMIN_USER_PLAN, set_user_plan, methods=["PATCH"])
api_router.add_api_route(Routes.ADMIN_USER_REMOVE, remove_user, methods=["POST"])
api_router.add_api_route(Routes.ADMIN_USER_RESTORE, restore_user, methods=["POST"])
api_router.add_api_route(Routes.ADMIN_NAICS_CATALOG, list_naics_catalog, methods=["GET"])
api_router.add_api_route(Routes.ADMIN_USER_NAICS, get_user_naics, methods=["GET"])
api_router.add_api_route(Routes.ADMIN_USER_NAICS, set_user_naics, methods=["PUT"])
api_router.add_api_route(Routes.ADMIN_USER_RADAR_RUNS, list_user_radar_runs, methods=["GET"])
api_router.add_api_route(Routes.ADMIN_PAYMENTS, list_payments, methods=["GET"])
api_router.add_api_route(Routes.ADMIN_LEADS, list_leads, methods=["GET"])
api_router.add_api_route(Routes.ADMIN_LEAD, update_lead, methods=["PATCH"])
api_router.add_api_route(
    Routes.ADMIN_CURATED_OPPORTUNITIES, list_curated_opportunities, methods=["GET"]
)
api_router.add_api_route(
    Routes.ADMIN_CURATED_OPPORTUNITIES, create_curated_opportunity, methods=["POST"]
)
api_router.add_api_route(
    Routes.ADMIN_CURATED_OPPORTUNITY, get_curated_opportunity, methods=["GET"]
)
api_router.add_api_route(
    Routes.ADMIN_CURATED_OPPORTUNITY, update_curated_opportunity, methods=["PATCH"]
)
api_router.add_api_route(
    Routes.ADMIN_CURATED_OPPORTUNITY_VISIBILITY, set_curated_visibility, methods=["PUT"]
)
api_router.add_api_route(
    Routes.ADMIN_CURATED_OPPORTUNITY_ARCHIVE, archive_curated_opportunity, methods=["POST"]
)
api_router.add_api_route(Routes.ADMIN_GEMINI_TEST, admin_test_gemini, methods=["POST"])
api_router.add_api_route(Routes.CONTACT, submit_contact, methods=["POST"])
api_router.add_api_route(Routes.ACCESS_REQUESTS, create_access_request, methods=["POST"])
api_router.add_api_route(Routes.FREE_SIGNUP, signup_free, methods=["POST"])
api_router.add_api_route(Routes.RAZORPAY_ORDER, create_order, methods=["POST"])
api_router.add_api_route(Routes.RAZORPAY_VERIFY, verify_payment, methods=["POST"])
api_router.add_api_route(Routes.AUTH_LOGIN, customer_login, methods=["POST"])
api_router.add_api_route(Routes.AUTH_ME, customer_me, methods=["GET"])
api_router.add_api_route(Routes.AUTH_ME, update_customer_profile, methods=["PATCH"])
api_router.add_api_route(Routes.AUTH_SET_PASSWORD, set_password, methods=["POST"])
api_router.add_api_route(Routes.AUTH_RESEND_SETUP, resend_setup, methods=["POST"])
api_router.add_api_route(Routes.AUTH_PROVISIONING_STATUS, provisioning_status, methods=["GET"])
api_router.add_api_route(Routes.WORKSPACE_TEAM, list_team, methods=["GET"])
api_router.add_api_route(Routes.WORKSPACE_TEAM_INVITE, invite_member, methods=["POST"])
api_router.add_api_route(Routes.WORKSPACE_TEAM_MEMBER, remove_member, methods=["DELETE"])
api_router.add_api_route(Routes.RADAR_RESULTS, latest_results, methods=["GET"])

# OP frontend read API.
_OP_READS = [
    (Routes.OP_OPPORTUNITIES, op_controller.list_opportunities),
    (Routes.OP_SHARED_OPPORTUNITIES, op_controller.list_shared_opportunities),
    (Routes.OP_OPPORTUNITY_COMPANIES, op_controller.list_opportunity_companies),
    (Routes.OP_COMPANY_HIRING_SIGNAL, op_controller.company_hiring_signal),
    (Routes.OP_OPPORTUNITY, op_controller.get_opportunity),
    (Routes.OP_OPPORTUNITY_OPEN, op_controller.open_opportunity_source),
    (Routes.OP_OPPORTUNITY_ACTIVITY, op_controller.opportunity_activity),
    (Routes.OP_OPPORTUNITY_OUTREACH, op_controller.opportunity_outreach),
    (Routes.OP_OPPORTUNITY_ASSIGNMENTS, op_controller.opportunity_assignments),
    (Routes.OP_VENDORS, op_controller.list_vendors),
    (Routes.OP_VENDOR, op_controller.get_vendor),
    (Routes.OP_DASHBOARD_METRICS, op_controller.dashboard_metrics),
    (Routes.OP_DASHBOARD_OVERVIEW, op_controller.dashboard_overview),
    (Routes.OP_DASHBOARD_PIPELINE, op_controller.dashboard_pipeline),
    (Routes.OP_DASHBOARD_ATTENTION, op_controller.dashboard_needs_attention),
    (Routes.OP_DASHBOARD_DEADLINES, op_controller.dashboard_deadlines),
    (Routes.OP_ACTIVITY, op_controller.list_activity),
    (Routes.OP_ASSIGNMENTS_ME, op_controller.my_assignments),
    (Routes.OP_TEAM_OWNERSHIP, op_controller.team_ownership),
    (Routes.OP_NOTIFICATIONS, op_controller.list_notifications),
    (Routes.OP_SAVED_VIEWS, op_controller.list_saved_views),
    (Routes.OP_SEARCH, op_controller.search),
    (Routes.RADAR_STATUS, op_controller.radar_status),
    (Routes.RADAR_RUNS, op_controller.list_radar_runs),
]
for _path, _handler in _OP_READS:
    api_router.add_api_route(_path, _handler, methods=["GET"])

api_router.add_api_route(
    Routes.OP_OPPORTUNITY_ASSIGN, op_controller.assign_opportunity, methods=["POST"]
)
api_router.add_api_route(
    Routes.OP_OPPORTUNITY_ASSIGN, op_controller.unassign_opportunity, methods=["DELETE"]
)

# Writes that have no storage yet answer 501 instead of 404.
_OP_WRITES = [
    (Routes.OP_OPPORTUNITY_SAVED, op_controller.opportunity_write, ["POST"]),
    (Routes.OP_OPPORTUNITY_NOTES, op_controller.opportunity_write, ["POST"]),
    (Routes.OP_OPPORTUNITY_FOLLOW_UP, op_controller.opportunity_write, ["POST"]),
    (Routes.OP_NOTIFICATION_READ, op_controller.notification_read, ["POST"]),
    (Routes.OP_NOTIFICATIONS_READ_ALL, op_controller.notifications_read_all, ["POST"]),
    (Routes.OP_SAVED_VIEWS, op_controller.create_saved_view, ["POST"]),
    (Routes.OP_SAVED_VIEW, op_controller.delete_saved_view, ["DELETE"]),
    (Routes.OP_OUTREACH, op_controller.send_outreach, ["POST"]),
]
for _path, _handler, _methods in _OP_WRITES:
    # opportunity_write backs several paths, so name each one for OpenAPI.
    _slug = _path.replace("/", "_").replace("{", "").replace("}", "").strip("_")
    api_router.add_api_route(_path, _handler, methods=_methods, operation_id=_slug)

api_router.add_api_route(
    Routes.OP_OUTREACH_AI_DRAFT, generate_outreach_ai_draft, methods=["POST"]
)
api_router.add_api_route(Routes.RADAR_RUN, op_controller.trigger_radar_run, methods=["POST"])
