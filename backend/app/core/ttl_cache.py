"""Short-lived in-process response cache for idempotent GET APIs.

Keyed by auth + path + query so workspaces never share payloads. Designed for
a single uvicorn worker; multi-worker deploys each keep their own cache.
"""

from __future__ import annotations

import hashlib
import threading
import time
from dataclasses import dataclass
from typing import Any

from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp, Message, Receive, Scope, Send

# Paths that are safe to cache briefly (read-only dashboard / status).
_CACHEABLE_PREFIXES = (
    "/api/v1/dashboard/",
    "/api/v1/radar/status",
    "/api/v1/notifications",
    "/api/v1/team/ownership",
    "/api/v1/assignments/me",
)


@dataclass
class _Entry:
    expires_at: float
    status_code: int
    body: bytes
    media_type: str
    headers: list[tuple[str, str]]


class TtlResponseCache:
    def __init__(self, *, ttl_seconds: float = 8.0, max_entries: int = 512) -> None:
        self.ttl_seconds = ttl_seconds
        self.max_entries = max_entries
        self._lock = threading.Lock()
        self._store: dict[str, _Entry] = {}

    def get(self, key: str) -> _Entry | None:
        now = time.monotonic()
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            if entry.expires_at <= now:
                self._store.pop(key, None)
                return None
            return entry

    def set(
        self,
        key: str,
        *,
        status_code: int,
        body: bytes,
        media_type: str,
        headers: list[tuple[str, str]],
    ) -> None:
        if status_code != 200 or not body:
            return
        with self._lock:
            if len(self._store) >= self.max_entries:
                # Drop expired first, then oldest by expiry.
                now = time.monotonic()
                expired = [k for k, v in self._store.items() if v.expires_at <= now]
                for k in expired:
                    self._store.pop(k, None)
                if len(self._store) >= self.max_entries:
                    for k, _ in sorted(self._store.items(), key=lambda kv: kv[1].expires_at)[
                        : max(1, self.max_entries // 10)
                    ]:
                        self._store.pop(k, None)
            self._store[key] = _Entry(
                expires_at=time.monotonic() + self.ttl_seconds,
                status_code=status_code,
                body=body,
                media_type=media_type,
                headers=headers,
            )

    def clear(self) -> None:
        with self._lock:
            self._store.clear()

    def stats(self) -> dict[str, Any]:
        with self._lock:
            return {"entries": len(self._store), "ttlSeconds": self.ttl_seconds}


_cache = TtlResponseCache()


def cache_stats() -> dict[str, Any]:
    return _cache.stats()


def invalidate_response_cache() -> None:
    _cache.clear()


def _is_cacheable(method: str, path: str) -> bool:
    if method.upper() != "GET":
        return False
    if path == "/api/v1/radar/status":
        return True
    return any(path.startswith(prefix) for prefix in _CACHEABLE_PREFIXES)


def _cache_key(request: Request) -> str:
    auth = request.headers.get("authorization") or ""
    auth_digest = hashlib.sha256(auth.encode("utf-8")).hexdigest()[:24] if auth else "anon"
    return f"{auth_digest}:{request.url.path}?{request.url.query}"


class ResponseCacheMiddleware:
    def __init__(
        self,
        app: ASGIApp,
        *,
        enabled: bool = True,
        ttl_seconds: float = 8.0,
    ) -> None:
        self.app = app
        self.enabled = enabled
        _cache.ttl_seconds = max(0.5, float(ttl_seconds))

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if not self.enabled or scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive=receive)
        if not _is_cacheable(request.method, request.url.path):
            # Mutations should drop stale dashboard payloads immediately.
            if request.method.upper() in {"POST", "PUT", "PATCH", "DELETE"} and request.url.path.startswith(
                "/api/"
            ):
                invalidate_response_cache()
            await self.app(scope, receive, send)
            return

        key = _cache_key(request)
        hit = _cache.get(key)
        if hit is not None:
            response = Response(
                content=hit.body,
                status_code=hit.status_code,
                media_type=hit.media_type,
                headers={
                    **{k: v for k, v in hit.headers if k.lower() not in {"content-length", "content-type"}},
                    "X-Cache": "HIT",
                },
            )
            await response(scope, receive, send)
            return

        status_code = 500
        response_headers: list[tuple[str, str]] = []
        body_chunks: list[bytes] = []

        async def send_wrapper(message: Message) -> None:
            nonlocal status_code, response_headers
            if message["type"] == "http.response.start":
                status_code = int(message["status"])
                response_headers = [(k.decode("latin-1"), v.decode("latin-1")) for k, v in message.get("headers", [])]
                headers = list(message.get("headers", []))
                headers.append((b"x-cache", b"MISS"))
                await send({**message, "headers": headers})
            elif message["type"] == "http.response.body":
                body = message.get("body", b"") or b""
                if body:
                    body_chunks.append(body)
                more = message.get("more_body", False)
                if not more:
                    media = "application/json"
                    for name, value in response_headers:
                        if name.lower() == "content-type":
                            media = value.split(";")[0].strip() or media
                            break
                    _cache.set(
                        key,
                        status_code=status_code,
                        body=b"".join(body_chunks),
                        media_type=media,
                        headers=response_headers,
                    )
                await send(message)
            else:
                await send(message)

        await self.app(scope, receive, send_wrapper)
