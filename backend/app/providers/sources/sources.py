"""All board/sources in one file.

Commercial ATS boards come from the verified Radar catalog
(Greenhouse / Lever / Ashby). SAM.gov stays the government lane.
`collector` must match a key in collectors/collectors.py COLLECTORS.
"""

from __future__ import annotations

from typing import Any

from app.providers.collectors.collectors import COLLECTORS

# Display-name overrides where simple title-case looks wrong.
_NAME_OVERRIDES: dict[str, str] = {
    "adyen": "Adyen",
    "airbnb": "Airbnb",
    "airtable": "Airtable",
    "anthropic": "Anthropic",
    "ashby": "Ashby",
    "cloudflare": "Cloudflare",
    "coinbase": "Coinbase",
    "cursor": "Cursor",
    "databricks": "Databricks",
    "datadog": "Datadog",
    "deepl": "DeepL",
    "discord": "Discord",
    "doordash": "DoorDash",
    "duolingo": "Duolingo",
    "elevenlabs": "ElevenLabs",
    "epicgames": "Epic Games",
    "eventbrite": "Eventbrite",
    "figma": "Figma",
    "gitlab": "GitLab",
    "hashicorp": "HashiCorp",
    "hubspot": "HubSpot",
    "instacart": "Instacart",
    "launchdarkly": "LaunchDarkly",
    "linkedin": "LinkedIn",
    "mongodb": "MongoDB",
    "netflix": "Netflix",
    "newrelic": "New Relic",
    "notion": "Notion",
    "openai": "OpenAI",
    "opensea": "OpenSea",
    "pagerduty": "PagerDuty",
    "palantir": "Palantir",
    "perplexity": "Perplexity",
    "phonepe": "PhonePe",
    "pinterest": "Pinterest",
    "postman": "Postman",
    "purestorage": "Pure Storage",
    "reddit": "Reddit",
    "riotgames": "Riot Games",
    "robinhood": "Robinhood",
    "runwayml": "Runway ML",
    "scaleai": "Scale AI",
    "shopify": "Shopify",
    "skyscanner": "Skyscanner",
    "smartsheet": "Smartsheet",
    "spotify": "Spotify",
    "stripe": "Stripe",
    "substack": "Substack",
    "sumologic": "Sumo Logic",
    "supabase": "Supabase",
    "taskrabbit": "TaskRabbit",
    "tripadvisor": "Tripadvisor",
    "twilio": "Twilio",
    "udacity": "Udacity",
    "udemy": "Udemy",
    "vercel": "Vercel",
    "wealthfront": "Wealthfront",
    "webflow": "Webflow",
    "zapier": "Zapier",
    "zoominfo": "ZoomInfo",
    "zscaler": "Zscaler",
}

# Verified public Greenhouse Job Board API tokens (from Radar ats_catalog).
_GREENHOUSE_TOKENS: tuple[str, ...] = (
    "adyen",
    "affirm",
    "airbnb",
    "airtable",
    "amplitude",
    "anthropic",
    "asana",
    "block",
    "brex",
    "canonical",
    "carta",
    "checkr",
    "chime",
    "cloudflare",
    "coinbase",
    "coursera",
    "databricks",
    "datadog",
    "dialpad",
    "discord",
    "doordash",
    "dropbox",
    "druva",
    "duolingo",
    "elastic",
    "epicgames",
    "figma",
    "fivetran",
    "flexport",
    "gemini",
    "gitlab",
    "glossier",
    "groww",
    "gusto",
    "hashicorp",
    "hubspot",
    "instacart",
    "intercom",
    "kayak",
    "launchdarkly",
    "lyft",
    "marqeta",
    "mercury",
    "mongodb",
    "netlify",
    "newrelic",
    "notion",
    "nuro",
    "okta",
    "oura",
    "pagerduty",
    "peloton",
    "phonepe",
    "pinterest",
    "postman",
    "purestorage",
    "reddit",
    "ripple",
    "riotgames",
    "roblox",
    "robinhood",
    "rubrik",
    "samsara",
    "scaleai",
    "shopify",
    "skyscanner",
    "smartsheet",
    "sofi",
    "stripe",
    "sumologic",
    "taskrabbit",
    "toast",
    "tripadvisor",
    "twilio",
    "udacity",
    "udemy",
    "vercel",
    "webflow",
    "wrike",
    "zoominfo",
    "zscaler",
)

_LEVER_TOKENS: tuple[str, ...] = (
    "box",
    "eventbrite",
    "netflix",
    "outreach",
    "palantir",
    "quora",
    "ro",
    "spotify",
    "uber",
    "wealthfront",
    "yelp",
)

_ASHBY_TOKENS: tuple[str, ...] = (
    "ashby",
    "applied",
    "benchling",
    "character",
    "cohere",
    "cursor",
    "deepl",
    "elevenlabs",
    "ganymede",
    "harvey",
    "hex",
    "linear",
    "lovable",
    "mercury",
    "notable",
    "notion",
    "openai",
    "opensea",
    "perplexity",
    "persona",
    "pika",
    "plaid",
    "ramp",
    "replit",
    "retool",
    "runway",
    "runwayml",
    "sierra",
    "substack",
    "supabase",
    "vercel",
    "watershed",
    "zapier",
)


def _display_name(token: str) -> str:
    key = token.strip().lower()
    if key in _NAME_OVERRIDES:
        return _NAME_OVERRIDES[key]
    return key.replace("-", " ").replace("_", " ").title()


def _ats_source(collector: str, token: str) -> dict[str, Any]:
    return {
        "collector": collector,
        "token": token,
        "name": _display_name(token),
        "enabled": True,
    }


SOURCES: list[dict[str, Any]] = [
    *[_ats_source("greenhouse", t) for t in _GREENHOUSE_TOKENS],
    *[_ats_source("lever", t) for t in _LEVER_TOKENS],
    *[_ats_source("ashby", t) for t in _ASHBY_TOKENS],
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
