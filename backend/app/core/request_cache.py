"""Per-HTTP-request memoization for expensive rebuilds.

FastAPI may run sync handlers on worker threads; ContextVar keeps the cache
scoped to the current request (set by middleware in app.main).
"""

from __future__ import annotations

from contextvars import ContextVar, Token
from typing import Any

_request_cache: ContextVar[dict[str, Any] | None] = ContextVar(
    "op_request_cache", default=None
)


def begin_request_cache() -> Token:
    return _request_cache.set({})


def end_request_cache(token: Token) -> None:
    _request_cache.reset(token)


def get_request_cache() -> dict[str, Any]:
    """Return the active request cache, or a throwaway dict outside a request."""
    cache = _request_cache.get()
    if cache is None:
        return {}
    return cache
