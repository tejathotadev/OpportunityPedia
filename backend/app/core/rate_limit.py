"""In-process sliding-window rate limits (single worker / local + Railway).

No Redis required. Limits reset on process restart. Fine for one uvicorn
worker; use a shared store only when you run multiple workers behind a load
balancer.
"""

from __future__ import annotations

import hashlib
import threading
import time
from collections import deque
from dataclasses import dataclass
from typing import Deque

from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.types import ASGIApp, Receive, Scope, Send


@dataclass(frozen=True)
class LimitRule:
    limit: int
    window_seconds: float


class SlidingWindowLimiter:
    def __init__(self, *, max_keys: int = 20_000) -> None:
        self._lock = threading.Lock()
        self._hits: dict[str, Deque[float]] = {}
        self._max_keys = max_keys

    def check(self, key: str, rule: LimitRule) -> tuple[bool, float]:
        """Return (allowed, retry_after_seconds)."""
        now = time.monotonic()
        cutoff = now - rule.window_seconds
        with self._lock:
            bucket = self._hits.get(key)
            if bucket is None:
                if len(self._hits) >= self._max_keys:
                    self._evict_oldest(now)
                bucket = deque()
                self._hits[key] = bucket
            while bucket and bucket[0] < cutoff:
                bucket.popleft()
            if len(bucket) >= rule.limit:
                retry = max(0.0, rule.window_seconds - (now - bucket[0]))
                return False, retry
            bucket.append(now)
            return True, 0.0

    def _evict_oldest(self, now: float) -> None:
        # Drop empty/stale buckets first, then arbitrary oldest keys.
        stale = [k for k, q in self._hits.items() if not q or now - q[-1] > 600]
        for k in stale[: max(1, len(self._hits) // 10)]:
            self._hits.pop(k, None)
        if len(self._hits) >= self._max_keys:
            for k in list(self._hits.keys())[: max(1, len(self._hits) // 20)]:
                self._hits.pop(k, None)


_limiter = SlidingWindowLimiter()


def client_identity(request: Request) -> str:
    forwarded = (request.headers.get("x-forwarded-for") or "").split(",")[0].strip()
    host = forwarded or (request.client.host if request.client else "unknown")
    auth = request.headers.get("authorization") or ""
    if auth:
        digest = hashlib.sha256(auth.encode("utf-8")).hexdigest()[:16]
        return f"{host}:{digest}"
    return host


def rule_for_path(path: str, *, auth: LimitRule, public: LimitRule, api: LimitRule) -> LimitRule | None:
    if path in {"/health", "/docs", "/openapi.json", "/redoc"}:
        return None
    if not path.startswith("/api/"):
        return None
    # Radar run has its own cooldown / daily cap — do not double-throttle here.
    if path.endswith("/radar/run") or path.rstrip("/").endswith("/radar/run"):
        return None
    if path.endswith("/login") or path.rstrip("/").endswith("/login"):
        return auth
    if any(
        path.startswith(prefix)
        for prefix in (
            "/api/v1/contact",
            "/api/v1/access-requests",
            "/api/v1/plans/",
            "/api/v1/payments/",
            "/api/v1/auth/resend-setup",
            "/api/v1/auth/set-password",
        )
    ):
        return public
    return api


class RateLimitMiddleware:
    """ASGI middleware so it runs early and stays sync/async-safe."""

    def __init__(
        self,
        app: ASGIApp,
        *,
        enabled: bool = True,
        auth_limit: int = 20,
        auth_window: float = 60.0,
        public_limit: int = 30,
        public_window: float = 60.0,
        api_limit: int = 180,
        api_window: float = 60.0,
    ) -> None:
        self.app = app
        self.enabled = enabled
        self.auth = LimitRule(auth_limit, auth_window)
        self.public = LimitRule(public_limit, public_window)
        self.api = LimitRule(api_limit, api_window)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if not self.enabled or scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive=receive)
        rule = rule_for_path(
            request.url.path,
            auth=self.auth,
            public=self.public,
            api=self.api,
        )
        if rule is None:
            await self.app(scope, receive, send)
            return

        key = f"{rule.limit}:{rule.window_seconds}:{client_identity(request)}:{_bucket_label(request.url.path)}"
        allowed, retry_after = _limiter.check(key, rule)
        if not allowed:
            response: Response = JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Try again in a moment."},
                headers={"Retry-After": str(max(1, int(retry_after + 0.999)))},
            )
            await response(scope, receive, send)
            return

        await self.app(scope, receive, send)


def _bucket_label(path: str) -> str:
    if path.endswith("/login"):
        return "login"
    if path.startswith("/api/v1/auth") or path.startswith("/api/v1/plans"):
        return "authish"
    if path.startswith("/api/v1/contact") or path.startswith("/api/v1/access"):
        return "public"
    if path.startswith("/api/v1/payments"):
        return "payments"
    return "api"
