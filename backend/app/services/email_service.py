from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

import httpx

from app.core.timeouts import EMAIL_HTTP_TIMEOUT_SECONDS, SMTP_TIMEOUT_SECONDS
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


def _mailbox_email(raw: str) -> str:
    """Extract the bare email from `Name <email>` or a plain address."""
    text = (raw or "").strip()
    if "<" in text and ">" in text:
        return text[text.rfind("<") + 1 : text.rfind(">")].strip()
    return text


def format_from_address(*, display_name: str | None = None) -> str:
    """Platform mailbox with an optional customer-facing display name.

    Delivery still uses the verified EMAIL_FROM / SMTP address; only the
    visible From name changes (e.g. customer company instead of OpportunityPedia).
    """
    base = _from_address()
    email = _mailbox_email(base)
    if not email:
        return base
    label = (display_name or "").strip()
    if not label:
        return base
    # Strip characters that break RFC 5322 display-name formatting.
    safe = " ".join(label.replace('"', "").replace("\\", "").split())
    if not safe:
        return base
    if any(ch in safe for ch in (",", "<", ">", "@")):
        return f'"{safe}" <{email}>'
    return f"{safe} <{email}>"


def _smtp_timeout() -> float:
    return max(1.0, float(SMTP_TIMEOUT_SECONDS))


def _send_via_resend(
    *,
    to_email: str,
    subject: str,
    text: str,
    html: str | None = None,
    reply_to: str | None = None,
    from_address: str | None = None,
) -> None:
    payload: dict = {
        "from": from_address or _from_address(),
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
        timeout=float(EMAIL_HTTP_TIMEOUT_SECONDS),
    )
    if response.status_code >= 400:
        detail = response.text[:400]
        raise RuntimeError(f"Resend error {response.status_code}: {detail}")


def _send_via_smtp_credentials(
    message: EmailMessage,
    *,
    host: str,
    port: int,
    username: str,
    password: str,
    use_ssl: bool,
) -> None:
    """Send with explicit SMTP credentials (workspace or platform)."""
    timeout = _smtp_timeout()
    if use_ssl:
        with smtplib.SMTP_SSL(host, port, timeout=timeout) as smtp:
            smtp.login(username, password)
            smtp.send_message(message)
    else:
        with smtplib.SMTP(host, port, timeout=timeout) as smtp:
            smtp.starttls()
            smtp.login(username, password)
            smtp.send_message(message)


def _send_via_smtp(message: EmailMessage) -> None:
    """Open platform SMTP with a hard timeout so Railway invites cannot hang indefinitely."""
    _send_via_smtp_credentials(
        message,
        host=settings.SMTP_HOST,
        port=settings.SMTP_PORT,
        username=settings.SMTP_USER,
        password=settings.SMTP_PASSWORD,
        use_ssl=bool(settings.SMTP_USE_SSL),
    )


def _deliver(
    *,
    to_email: str,
    subject: str,
    text: str,
    html: str | None = None,
    reply_to: str | None = None,
    from_address: str | None = None,
    smtp_override: dict | None = None,
) -> None:
    """Prefer workspace SMTP when provided; else Resend; else platform SMTP."""
    if smtp_override:
        sender = from_address or smtp_override.get("from_email") or _from_address()
        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = sender
        message["To"] = to_email
        if reply_to:
            message["Reply-To"] = reply_to
        message.set_content(text)
        if html:
            message.add_alternative(html, subtype="html")
        _send_via_smtp_credentials(
            message,
            host=str(smtp_override["host"]),
            port=int(smtp_override["port"]),
            username=str(smtp_override["username"]),
            password=str(smtp_override["password"]),
            use_ssl=bool(smtp_override.get("use_ssl")),
        )
        return

    sender = from_address or _from_address()
    if resend_configured():
        _send_via_resend(
            to_email=to_email,
            subject=subject,
            text=text,
            html=html,
            reply_to=reply_to,
            from_address=sender,
        )
        return
    if not smtp_configured():
        raise RuntimeError("Email is not configured (set RESEND_API_KEY or SMTP_*)")

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = sender
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
) -> tuple[bool, str | None]:
    """Return (sent, error). Caller keeps setup_url as admin fallback when not sent."""
    if not email_configured():
        return False, "Email is not configured (set RESEND_API_KEY or SMTP_*)"

    subject = "Create your OpportunityPedia password"
    if reason == "teammate":
        intro = (
            "You've been invited to a teammate seat on OpportunityPedia. "
            "Create your password using this link (valid for 24 hours):"
        )
        intro_html = (
            "You've been invited to a teammate seat on OpportunityPedia. "
            f'<a href="{setup_url}">Create your password</a> '
            "(link valid for 24 hours)."
        )
        after = (
            "After you set your password, you can sign in and work in your "
            "team's shared workspace right away."
        )
    elif reason in {"invite", "free"}:
        intro = (
            "Your OpportunityPedia account is ready. "
            "Create your password using this link (valid for 24 hours):"
        )
        intro_html = (
            "Your OpportunityPedia account is ready. "
            f'<a href="{setup_url}">Create your password</a> '
            "(link valid for 24 hours)."
        )
        after = (
            "After you set your password, we will finish setting up your workspace "
            "(usually about 10 minutes). You can sign in as soon as setup is complete."
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
        after = "After you set your password, continue from the link destination."

    text = (
        f"Hi {name},\n\n"
        f"{intro}\n\n"
        f"{setup_url}\n\n"
        f"{after}\n\n"
        "If you did not expect this email, you can ignore it.\n"
    )
    html = (
        f"<p>Hi {name},</p>"
        f"<p>{intro_html}</p>"
        f"<p>{after}</p>"
    )
    try:
        _deliver(to_email=to_email, subject=subject, text=text, html=html)
        return True, None
    except Exception as exc:
        logger.warning("password-setup email failed to %s: %s", to_email, exc)
        return False, str(exc)[:300]


def send_outreach_email(
    *,
    to_email: str,
    subject: str,
    body: str,
    reply_to: str | None = None,
    from_display_name: str | None = None,
    smtp_override: dict | None = None,
) -> None:
    """Send a composed outreach message. Raises on delivery failure.

    When ``smtp_override`` is set (workspace company SMTP), mail leaves from
    that mailbox. Otherwise delivery uses the verified platform mailbox and
    ``from_display_name`` only changes the visible From name.
    """
    if smtp_override:
        from_name = (smtp_override.get("from_name") or from_display_name or "").strip()
        mailbox = str(smtp_override.get("from_email") or "").strip()
        if from_name and mailbox:
            safe = " ".join(from_name.replace('"', "").replace("\\", "").split())
            if any(ch in safe for ch in (",", "<", ">", "@")):
                from_address = f'"{safe}" <{mailbox}>'
            else:
                from_address = f"{safe} <{mailbox}>"
        else:
            from_address = mailbox or None
        _deliver(
            to_email=to_email,
            subject=subject,
            text=body,
            html=None,
            reply_to=reply_to,
            from_address=from_address,
            smtp_override=smtp_override,
        )
        return

    if not email_configured():
        raise RuntimeError("Email is not configured (set RESEND_API_KEY or SMTP_*)")
    _deliver(
        to_email=to_email,
        subject=subject,
        text=body,
        html=None,
        reply_to=reply_to,
        from_address=format_from_address(display_name=from_display_name),
    )


def send_test_via_smtp(
    *,
    to_email: str,
    host: str,
    port: int,
    username: str,
    password: str,
    from_email: str,
    from_name: str | None = None,
    use_ssl: bool = False,
) -> None:
    """Send a short test message using the given SMTP credentials."""
    label = (from_name or "").strip() or "OpportunityPedia"
    safe = " ".join(label.replace('"', "").replace("\\", "").split())
    if any(ch in safe for ch in (",", "<", ">", "@")):
        sender = f'"{safe}" <{from_email}>'
    else:
        sender = f"{safe} <{from_email}>"
    _deliver(
        to_email=to_email,
        subject="OpportunityPedia SMTP test",
        text=(
            "This is a test email from OpportunityPedia.\n\n"
            "Your workspace SMTP settings are working.\n"
        ),
        html=None,
        reply_to=None,
        from_address=sender,
        smtp_override={
            "host": host,
            "port": port,
            "username": username,
            "password": password,
            "from_email": from_email,
            "use_ssl": use_ssl,
        },
    )
