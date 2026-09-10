from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"
DEFAULT_FROM = "OpportunityPedia <hello@opportunitypedia.com>"


def smtp_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)


def resend_configured() -> bool:
    return bool(settings.RESEND_API_KEY)


def email_configured() -> bool:
    """True when Resend or SMTP can deliver mail."""
    return resend_configured() or smtp_configured()


def _from_address() -> str:
    return settings.EMAIL_FROM or settings.SMTP_FROM or settings.SMTP_USER or DEFAULT_FROM


def _smtp_timeout() -> float:
    return max(1.0, float(settings.SMTP_TIMEOUT_SECONDS or 8))


def _send_via_resend(
    *,
    to_email: str,
    subject: str,
    text: str,
    html: str | None = None,
    reply_to: str | None = None,
) -> None:
    payload: dict = {
        "from": _from_address(),
        "to": [to_email],
        "subject": subject,
        "text": text,
    }
    if html:
        payload["html"] = html
    if reply_to:
        payload["reply_to"] = reply_to

    response = httpx.post(
        RESEND_API_URL,
        headers={
            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=15.0,
    )
    if response.status_code >= 400:
        detail = response.text[:400]
        raise RuntimeError(f"Resend error {response.status_code}: {detail}")


def _send_via_smtp(message: EmailMessage) -> None:
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


def _deliver(
    *,
    to_email: str,
    subject: str,
    text: str,
    html: str | None = None,
    reply_to: str | None = None,
) -> None:
    """Prefer Resend (HTTPS); fall back to SMTP when Resend is not configured."""
    if resend_configured():
        _send_via_resend(
            to_email=to_email,
            subject=subject,
            text=text,
            html=html,
            reply_to=reply_to,
        )
        return
    if not smtp_configured():
        raise RuntimeError("Email is not configured (set RESEND_API_KEY or SMTP_*)")

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = _from_address()
    message["To"] = to_email
    if reply_to:
        message["Reply-To"] = reply_to
    message.set_content(text)
    if html:
        message.add_alternative(html, subtype="html")
    _send_via_smtp(message)


def send_password_setup(
    *,
    to_email: str,
    name: str,
    setup_url: str,
    reason: str = "payment",
) -> bool:
    """Return True if mailed; False if missing/failed (caller still gets setup_url)."""
    if not email_configured():
        return False

    subject = "Create your OpportunityPedia password"
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

    text = (
        f"Hi {name},\n\n"
        f"{intro}\n\n"
        f"{setup_url}\n\n"
        "After you set your password, sign in at the login page.\n\n"
        "If you did not expect this email, you can ignore it.\n"
    )
    html = (
        f"<p>Hi {name},</p>"
        f"<p>{intro_html}</p>"
        "<p>After you set your password, sign in at the login page.</p>"
    )
    try:
        _deliver(to_email=to_email, subject=subject, text=text, html=html)
        return True
    except Exception as exc:
        logger.warning("password-setup email failed to %s: %s", to_email, exc)
        return False


def send_outreach_email(
    *,
    to_email: str,
    subject: str,
    body: str,
    reply_to: str | None = None,
) -> None:
    """Send a composed outreach message. Raises on delivery failure."""
    if not email_configured():
        raise RuntimeError("Email is not configured (set RESEND_API_KEY or SMTP_*)")
    _deliver(
        to_email=to_email,
        subject=subject,
        text=body,
        html=None,
        reply_to=reply_to,
    )
