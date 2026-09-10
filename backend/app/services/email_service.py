from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


def smtp_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)


def _smtp_timeout() -> float:
    return max(1.0, float(settings.SMTP_TIMEOUT_SECONDS or 8))


def _send(message: EmailMessage) -> None:
    """Open SMTP with a hard timeout so Railway invites cannot hang indefinitely."""
    timeout = _smtp_timeout()
    if settings.SMTP_USE_SSL:
        with smtplib.SMTP_SSL(
            settings.SMTP_HOST,
            settings.SMTP_PORT,
            timeout=timeout,
        ) as smtp:
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(message)
    else:
        with smtplib.SMTP(
            settings.SMTP_HOST,
            settings.SMTP_PORT,
            timeout=timeout,
        ) as smtp:
            smtp.starttls()
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(message)


def send_password_setup(
    *,
    to_email: str,
    name: str,
    setup_url: str,
    reason: str = "payment",
) -> bool:
    """Return True if mailed; False if SMTP missing/failed (caller still gets setup_url)."""
    if not smtp_configured():
        return False
    from_addr = settings.SMTP_FROM or settings.SMTP_USER
    message = EmailMessage()
    message["Subject"] = "Create your OpportunityPedia password"
    message["From"] = from_addr
    message["To"] = to_email
    if reason == "invite":
        intro = (
            "Your OpportunityPedia account is ready. "
            "Create your password using this link (valid for 24 hours):"
        )
        intro_html = (
            "Your OpportunityPedia account is ready. "
            f'<a href="{setup_url}">Create your password</a> '
            "(link valid for 24 hours)."
        )
    else:
        intro = (
            "Your payment is complete. Create your password using this link "
            "(valid for 24 hours):"
        )
        intro_html = (
            "Your payment is complete. "
            f'<a href="{setup_url}">Create your password</a> '
            "(link valid for 24 hours)."
        )
    message.set_content(
        f"Hi {name},\n\n"
        f"{intro}\n\n"
        f"{setup_url}\n\n"
        "After you set your password, sign in at the login page.\n\n"
        "If you did not expect this email, you can ignore it.\n"
    )
    message.add_alternative(
        f"<p>Hi {name},</p>"
        f"<p>{intro_html}</p>"
        "<p>After you set your password, sign in at the login page.</p>",
        subtype="html",
    )
    try:
        _send(message)
        return True
    except (TimeoutError, OSError, smtplib.SMTPException) as exc:
        logger.warning("password-setup email failed to %s: %s", to_email, exc)
        return False


def send_outreach_email(
    *,
    to_email: str,
    subject: str,
    body: str,
    reply_to: str | None = None,
) -> None:
    """Send a composed outreach message. Raises on SMTP failure."""
    if not smtp_configured():
        raise RuntimeError("SMTP is not configured")
    from_addr = settings.SMTP_FROM or settings.SMTP_USER
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = from_addr
    message["To"] = to_email
    if reply_to:
        message["Reply-To"] = reply_to
    message.set_content(body)
    _send(message)
