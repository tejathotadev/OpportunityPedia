from __future__ import annotations

import os
import re
from pathlib import Path

from dotenv import load_dotenv

_BACKEND_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(_BACKEND_ROOT / ".env")

_IDENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def _require_ident(value: str, field: str) -> str:
    name = (value or "").strip()
    if not _IDENT.match(name):
        raise ValueError(f"{field} must be a letter/underscore identifier, got {value!r}")
    return name


class Settings:
    # Supabase / Postgres. Preferred connection for all platform tables.
    DATABASE_URL: str = (os.getenv("DATABASE_URL") or "").strip()

    # Legacy MySQL knobs kept so old .env files do not crash import; unused
    # once DATABASE_URL is set.
    MYSQL_HOST: str = os.getenv("MYSQL_HOST", "127.0.0.1").strip() or "127.0.0.1"
    MYSQL_PORT: int = int(os.getenv("MYSQL_PORT", "3306") or "3306")
    MYSQL_USER: str = os.getenv("MYSQL_USER", "root").strip() or "root"
    MYSQL_PASSWORD: str = os.getenv("MYSQL_PASSWORD", "")
    MYSQL_DATABASE: str = _require_ident(
        os.getenv("MYSQL_DATABASE", "opportunitypedia"),
        "MYSQL_DATABASE",
    )
    TABLE_USERS: str = _require_ident(os.getenv("TABLE_USERS", "users"), "TABLE_USERS")
    TABLE_PAYMENTS: str = _require_ident(
        os.getenv("TABLE_PAYMENTS", "payments"),
        "TABLE_PAYMENTS",
    )
    TABLE_PASSWORD_TOKENS: str = _require_ident(
        os.getenv("TABLE_PASSWORD_TOKENS", "password_setup_tokens"),
        "TABLE_PASSWORD_TOKENS",
    )
    TABLE_RADAR_RUNS: str = _require_ident(
        os.getenv("TABLE_RADAR_RUNS", "radar_runs"),
        "TABLE_RADAR_RUNS",
    )
    TABLE_RADAR_JOBS: str = _require_ident(
        os.getenv("TABLE_RADAR_JOBS", "radar_jobs"),
        "TABLE_RADAR_JOBS",
    )
    TABLE_RADAR_VENDORS: str = _require_ident(
        os.getenv("TABLE_RADAR_VENDORS", "radar_vendors"),
        "TABLE_RADAR_VENDORS",
    )
    RADAR_HTTP_TIMEOUT_SECONDS: int = int(os.getenv("RADAR_HTTP_TIMEOUT_SECONDS", "60") or "60")
    RADAR_MAX_JOBS_PER_BOARD: int = int(os.getenv("RADAR_MAX_JOBS_PER_BOARD", "50") or "50")
    USER_AGENT: str = (
        os.getenv("USER_AGENT") or "OpportunityPediaRadar/0.1 (+https://opportunitypedia.com)"
    ).strip()
    SAM_GOV_API_KEY: str = (os.getenv("SAM_GOV_API_KEY") or "").strip()
    SAM_LOOKBACK_DAYS: int = int(os.getenv("SAM_LOOKBACK_DAYS", "365") or "365")
    # A run costs one request per NAICS code; non-federal keys allow 10/day.
    RADAR_RUN_COOLDOWN_HOURS: int = int(os.getenv("RADAR_RUN_COOLDOWN_HOURS", "6") or "6")
    # Takes precedence over the hours above when set, so a short window can be
    # dialled in for testing without expressing it as a fraction of an hour.
    RADAR_RUN_COOLDOWN_MINUTES: int = int(os.getenv("RADAR_RUN_COOLDOWN_MINUTES") or "0")
    # 0 lifts the daily cap entirely, leaving the cooldown as the only guard.
    RADAR_RUNS_PER_DAY: int = int(os.getenv("RADAR_RUNS_PER_DAY", "2") or "2")
    # Local-dev only: serve the OP read API as this customer when no token is
    # sent. 0 disables the fallback and the API requires a bearer token.
    OP_PUBLIC_USER_ID: int = int(os.getenv("OP_PUBLIC_USER_ID", "0") or "0")
    SAM_NAICS_CODES: str = (
        os.getenv("SAM_NAICS_CODES") or "561311,561312,561320,561330"
    ).strip()
    # Sent as `ncode`, one request per code. Verified: SAM accepts neither the
    # 5613 parent nor a comma-joined list (both return 0 results), so the full
    # six-digit codes are the only thing that works. Four codes per run against
    # a 10/day non-federal key is what sets RADAR_RUNS_PER_DAY below.
    SAM_NAICS_QUERY: str = (
        os.getenv("SAM_NAICS_QUERY") or "561311,561312,561320,561330"
    ).strip()
    SAM_ENTITY_LOOKUPS: int = int(os.getenv("SAM_ENTITY_LOOKUPS", "0") or "0")
    SAM_MAX_ROWS_PER_CODE: int = int(os.getenv("SAM_MAX_ROWS_PER_CODE", "2000") or "2000")
    SAM_EXCLUDE_EXPIRED: bool = (
        os.getenv("SAM_EXCLUDE_EXPIRED") or "true"
    ).strip().lower() in {"1", "true", "yes"}
    ADMIN_EMAIL: str = (os.getenv("ADMIN_EMAIL") or "").strip()
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD") or ""
    ADMIN_NAME: str = (os.getenv("ADMIN_NAME") or "Platform Admin").strip()
    DEMO_EMAIL: str = (os.getenv("DEMO_EMAIL") or "demo@opportunitypedia.com").strip()
    DEMO_PASSWORD: str = os.getenv("DEMO_PASSWORD") or "DemoAccess123!"
    DEMO_NAME: str = (os.getenv("DEMO_NAME") or "Demo Customer").strip()
    DEMO_COMPANY: str = (os.getenv("DEMO_COMPANY") or "OpportunityPedia Demo").strip()
    JWT_SECRET: str = (os.getenv("JWT_SECRET") or "change-me").strip()
    JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "720") or "720")
    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS",
        "http://127.0.0.1:8000,http://localhost:8000,"
        "http://127.0.0.1:8765,http://localhost:8765",
    ).strip()
    ACCESS_AMOUNT_CENTS: int = int(os.getenv("ACCESS_AMOUNT_CENTS", "4900") or "4900")
    ACCESS_AMOUNT_PAISE: int = int(
        os.getenv("ACCESS_AMOUNT_PAISE") or os.getenv("ACCESS_AMOUNT_CENTS", "4900") or "4900"
    )
    ACCESS_CURRENCY: str = (os.getenv("ACCESS_CURRENCY") or "inr").strip().lower()
    RAZORPAY_KEY_ID: str = (os.getenv("RAZORPAY_KEY_ID") or "").strip()
    RAZORPAY_KEY_SECRET: str = (os.getenv("RAZORPAY_KEY_SECRET") or "").strip()
    APP_PUBLIC_URL: str = (os.getenv("APP_PUBLIC_URL") or "http://127.0.0.1:8000").rstrip("/")
    # Where password-setup / invite links open (Vite or production site).
    FRONTEND_PUBLIC_URL: str = (
        os.getenv("FRONTEND_PUBLIC_URL") or os.getenv("APP_PUBLIC_URL") or "http://127.0.0.1:5173"
    ).rstrip("/")
    # Prefer Resend (HTTPS) on Railway. SMTP remains a local/dev fallback.
    RESEND_API_KEY: str = (os.getenv("RESEND_API_KEY") or "").strip()
    EMAIL_FROM: str = (os.getenv("EMAIL_FROM") or os.getenv("SMTP_FROM") or "").strip()
    SMTP_HOST: str = (os.getenv("SMTP_HOST") or "").strip()
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "465") or "465")
    SMTP_USER: str = (os.getenv("SMTP_USER") or "").strip()
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD") or ""
    SMTP_FROM: str = (os.getenv("SMTP_FROM") or "").strip()
    SMTP_USE_SSL: bool = (os.getenv("SMTP_USE_SSL") or "true").strip().lower() in {
        "1",
        "true",
        "yes",
    }
    # Keep well under the frontend Axios timeout so invite never hangs forever.
    SMTP_TIMEOUT_SECONDS: int = int(os.getenv("SMTP_TIMEOUT_SECONDS", "8") or "8")

    # --- P5: local-first rate limit / cache / logging / pool sizing ---
    # Works on one uvicorn worker without Redis or AWS. Disable with "false".
    RATE_LIMIT_ENABLED: bool = (os.getenv("RATE_LIMIT_ENABLED") or "true").strip().lower() in {
        "1",
        "true",
        "yes",
    }
    RATE_LIMIT_AUTH_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_AUTH_PER_MINUTE", "20") or "20")
    RATE_LIMIT_PUBLIC_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PUBLIC_PER_MINUTE", "30") or "30")
    RATE_LIMIT_API_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_API_PER_MINUTE", "180") or "180")
    RESPONSE_CACHE_ENABLED: bool = (
        os.getenv("RESPONSE_CACHE_ENABLED") or "true"
    ).strip().lower() in {"1", "true", "yes"}
    RESPONSE_CACHE_TTL_SECONDS: float = float(os.getenv("RESPONSE_CACHE_TTL_SECONDS", "8") or "8")
    REQUEST_LOG_ENABLED: bool = (os.getenv("REQUEST_LOG_ENABLED") or "true").strip().lower() in {
        "1",
        "true",
        "yes",
    }
    LOG_LEVEL: str = (os.getenv("LOG_LEVEL") or "INFO").strip() or "INFO"
    DB_POOL_MIN_SIZE: int = int(os.getenv("DB_POOL_MIN_SIZE", "1") or "1")
    DB_POOL_MAX_SIZE: int = int(os.getenv("DB_POOL_MAX_SIZE", "10") or "10")

    # Platform-wide Gemini key (AI outreach drafts). Empty = feature disabled.
    GEMINI_API_KEY: str = (os.getenv("GEMINI_API_KEY") or "").strip()
    GEMINI_MODEL: str = (
        os.getenv("GEMINI_MODEL") or "gemini-3.5-flash-lite"
    ).strip() or "gemini-3.5-flash-lite"

    @property
    def cors_origin_list(self) -> list[str]:
        return [part.strip() for part in self.CORS_ORIGINS.split(",") if part.strip()]

    @staticmethod
    def _code_list(raw: str) -> list[str]:
        codes: list[str] = []
        for part in raw.split(","):
            digits = re.sub(r"\D", "", part)
            if digits and digits not in codes:
                codes.append(digits)
        return codes

    @property
    def radar_cooldown_minutes(self) -> int:
        """Minutes required between runs; the hours setting is the fallback."""
        return self.RADAR_RUN_COOLDOWN_MINUTES or self.RADAR_RUN_COOLDOWN_HOURS * 60

    @property
    def sam_naics_code_list(self) -> list[str]:
        """Codes kept after the fetch (strict allow-list)."""
        return self._code_list(self.SAM_NAICS_CODES)

    @property
    def sam_naics_query_list(self) -> list[str]:
        """Codes sent to SAM as `ncode`; one request per entry."""
        return self._code_list(self.SAM_NAICS_QUERY) or self.sam_naics_code_list


settings = Settings()
