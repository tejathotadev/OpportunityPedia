"""Platform table names (Supabase Postgres). Radar tables stay deferred."""

from __future__ import annotations

from app.core.config import settings

# Legacy alias used by the old MySQL bootstrap script.
DATABASE = settings.MYSQL_DATABASE


class Tables:
    users = "users"
    payments = "payments"
    password_tokens = "password_setup_tokens"
    contact_leads = "contact_leads"
    support_tickets = "support_tickets"
    opportunity_details = "opportunity_details"
    company_hiring_signals = "company_hiring_signals"
    outreach_messages = "outreach_messages"
    opportunity_activities = "opportunity_activities"
    # Deferred / unused until radar is persisted:
    radar_runs = settings.TABLE_RADAR_RUNS
    radar_jobs = settings.TABLE_RADAR_JOBS
    radar_vendors = settings.TABLE_RADAR_VENDORS
