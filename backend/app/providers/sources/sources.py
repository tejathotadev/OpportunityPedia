"""All board/sources in one file.

Add Airbnb, SAM.gov, Stripe, etc. here — do not create a new file per source.
`collector` must match a key in collectors/collectors.py COLLECTORS.
"""

from __future__ import annotations

from typing import Any

from app.providers.collectors.collectors import COLLECTORS

SOURCES: list[dict[str, Any]] = [
    {
        "collector": "greenhouse",
        "token": "airbnb",
        "name": "Airbnb",
        "enabled": True,
    },
    {
        "collector": "greenhouse",
        "token": "gitlab",
        "name": "GitLab",
        "enabled": True,
    },
    {
        "collector": "sam_gov",
        "token": "sam-gov",
        "name": "SAM.gov",
        "enabled": True,
    },
]


def enabled_sources() -> list[dict[str, Any]]:
    """Sources that are enabled and whose collector is enabled."""
    active: list[dict[str, Any]] = []
    for source in SOURCES:
        if not source.get("enabled"):
            continue
        key = str(source.get("collector") or "")
        collector = COLLECTORS.get(key)
        if not collector or not collector.get("enabled"):
            continue
        active.append(dict(source))
    return active
