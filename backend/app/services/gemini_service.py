"""Platform Gemini helpers — outreach AI drafts + admin key test."""

from __future__ import annotations

import json
import logging
import re
from typing import Any

import httpx
from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)

_GEMINI_TIMEOUT = 45.0


def _require_key() -> str:
    key = (settings.GEMINI_API_KEY or "").strip()
    if not key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gemini is not configured. Add GEMINI_API_KEY in the backend .env and restart.",
        )
    return key


def _endpoint_url() -> str:
    model = (settings.GEMINI_MODEL or "gemini-3.5-flash-lite").strip()
    return (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent"
    )


def _extract_text(payload: dict[str, Any]) -> str:
    try:
        parts = payload["candidates"][0]["content"]["parts"]
        chunks = [str(p.get("text") or "") for p in parts if isinstance(p, dict)]
        return "\n".join(c for c in chunks if c).strip()
    except Exception:
        return ""


def _call_gemini(
    *,
    prompt: str,
    temperature: float = 0.35,
    json_mode: bool = False,
) -> str:
    key = _require_key()
    generation: dict[str, Any] = {
        "temperature": temperature,
        "maxOutputTokens": 2048,
    }
    if json_mode:
        generation["responseMimeType"] = "application/json"

    try:
        with httpx.Client(timeout=_GEMINI_TIMEOUT) as client:
            response = client.post(
                _endpoint_url(),
                params={"key": key},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": generation,
                },
            )
    except httpx.TimeoutException as exc:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Gemini timed out. Try again in a moment.",
        ) from exc
    except httpx.HTTPError as exc:
        logger.exception("Gemini HTTP error")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not reach Gemini. Check network and try again.",
        ) from exc

    if response.status_code >= 400:
        detail = "Gemini request failed."
        try:
            err = response.json()
            msg = (err.get("error") or {}).get("message")
            if msg:
                detail = str(msg)[:400]
        except Exception:
            detail = (response.text or detail)[:400]
        code = (
            status.HTTP_401_UNAUTHORIZED
            if response.status_code in (401, 403)
            else status.HTTP_502_BAD_GATEWAY
        )
        raise HTTPException(status_code=code, detail=detail)

    text = _extract_text(response.json())
    if not text:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gemini returned an empty response.",
        )
    return text


def test_connection() -> dict[str, Any]:
    """Admin-only ping so the platform key is verified before users rely on AI."""
    model = (settings.GEMINI_MODEL or "gemini-3.5-flash-lite").strip()
    if not (settings.GEMINI_API_KEY or "").strip():
        return {
            "ok": False,
            "configured": False,
            "model": model,
            "message": "GEMINI_API_KEY is empty in backend .env",
        }
    try:
        text = _call_gemini(
            prompt='Reply with exactly this JSON: {"status":"ok"}',
            temperature=0.0,
            json_mode=True,
        )
        return {
            "ok": True,
            "configured": True,
            "model": model,
            "message": "Gemini key works.",
            "sample": text[:120],
        }
    except HTTPException as exc:
        return {
            "ok": False,
            "configured": True,
            "model": model,
            "message": str(exc.detail),
        }


def _context_lines(opportunity: dict[str, Any], sender: dict[str, Any]) -> str:
    skills = opportunity.get("skills") or []
    technologies = opportunity.get("technologies") or []
    tags = list(dict.fromkeys([*(skills or []), *(technologies or [])]))[:12]
    contact = opportunity.get("contact") if isinstance(opportunity.get("contact"), dict) else {}
    hiring = opportunity.get("hiringFilters") if isinstance(opportunity.get("hiringFilters"), dict) else {}
    teams = hiring.get("teams") or []
    locations = hiring.get("locations") or []

    lines = [
        f"Company: {opportunity.get('companyName') or 'Unknown'}",
        f"Opportunity title: {opportunity.get('title') or 'Untitled'}",
        f"Type: {opportunity.get('noticeType') or opportunity.get('type') or ''}",
        f"Location: {opportunity.get('location') or ''}",
        f"Industry: {opportunity.get('industry') or ''}",
        f"Engagement: {opportunity.get('engagement') or ''}",
        f"Duration: {opportunity.get('duration') or ''}",
        f"Partnership model: {opportunity.get('partnershipModel') or ''}",
        f"Candidate requirement: {opportunity.get('candidateRequirement') or ''}",
        f"Experience: {opportunity.get('experience') or ''}",
        f"Skills/technologies: {', '.join(tags) if tags else ''}",
        f"Teams focus: {', '.join(teams) if teams else ''}",
        f"Location focus: {', '.join(locations) if locations else ''}",
        f"Summary: {(opportunity.get('summary') or '')[:500]}",
        f"Rationale: {(opportunity.get('rationale') or '')[:500]}",
        f"Description: {(opportunity.get('sourceSignal') or '')[:400]}",
        f"Contact name: {(contact or {}).get('name') or ''}",
        f"Contact email: {(contact or {}).get('email') or ''}",
        f"Sender name: {sender.get('name') or ''}",
        f"Sender company: {sender.get('company') or ''}",
        f"Sender email: {sender.get('email') or ''}",
        f"Sender phone: {sender.get('phone') or ''}",
        f"Outreach status: {opportunity.get('outreachStatus') or 'not_contacted'}",
    ]
    return "\n".join(lines)


def _parse_draft_json(raw: str) -> dict[str, str]:
    text = raw.strip()
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI draft was not valid JSON. Please try again.",
            )
        try:
            data = json.loads(match.group(0))
        except json.JSONDecodeError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI draft was not valid JSON. Please try again.",
            ) from exc

    subject = str(data.get("subject") or "").strip()
    body = str(data.get("body") or "").strip()
    if len(subject) < 3 or len(body) < 20:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI draft was incomplete. Please try again.",
        )
    # Soft length caps for UI safety.
    return {"subject": subject[:200], "body": body[:8000]}


def generate_outreach_draft(
    *,
    opportunity: dict[str, Any],
    sender: dict[str, Any],
    style_hint: str | None = None,
) -> dict[str, str]:
    """Return professional subject + body. Never auto-sends."""
    hint = (style_hint or "professional_first_touch").strip() or "professional_first_touch"
    prompt = f"""You are writing a professional B2B staffing / vendor partnership outreach email for OpportunityX.

Return ONLY valid JSON with keys "subject" and "body". No markdown, no code fences.

Rules (strict):
- Professional, concise, respectful tone. No hype, no emojis, no exclamation spam.
- Use ONLY facts present in CONTEXT. Do not invent deadlines, contract values, client names, visa status, or source platforms.
- If a field is empty, omit it — do not guess.
- Subject: one clear line, under 90 characters, no ALL CAPS.
- Body: short paragraphs, plain text (no HTML). Include a greeting and a clean sign-off using the sender details when available.
- Do not claim you already spoke, unless outreach status indicates prior contact.
- Do not mention "AI", "radar", "scraped", or internal tooling.
- Focus on offering relevant staffing / partnership help tied to the opportunity context.
- Style hint: {hint}

CONTEXT:
{_context_lines(opportunity, sender)}
"""
    raw = _call_gemini(prompt=prompt, temperature=0.4, json_mode=True)
    return _parse_draft_json(raw)
