from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import settings
from app.core.rate_limit import RateLimitMiddleware
from app.core.request_cache import begin_request_cache, end_request_cache
from app.core.request_logging import RequestLoggingMiddleware, configure_logging
from app.core.ttl_cache import ResponseCacheMiddleware, cache_stats
from app.db.connection import close_pool, init_pool, pool_stats


@asynccontextmanager
async def lifespan(_app: FastAPI):
    configure_logging(level=settings.LOG_LEVEL)
    init_pool(min_size=settings.DB_POOL_MIN_SIZE, max_size=settings.DB_POOL_MAX_SIZE)
    try:
        yield
    finally:
        close_pool()


app = FastAPI(title="Radar", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Last added runs first on the request: log → rate-limit → short TTL cache → CORS → handler.
app.add_middleware(
    ResponseCacheMiddleware,
    enabled=settings.RESPONSE_CACHE_ENABLED,
    ttl_seconds=settings.RESPONSE_CACHE_TTL_SECONDS,
)
app.add_middleware(
    RateLimitMiddleware,
    enabled=settings.RATE_LIMIT_ENABLED,
    auth_limit=settings.RATE_LIMIT_AUTH_PER_MINUTE,
    auth_window=60.0,
    public_limit=settings.RATE_LIMIT_PUBLIC_PER_MINUTE,
    public_window=60.0,
    api_limit=settings.RATE_LIMIT_API_PER_MINUTE,
    api_window=60.0,
)
app.add_middleware(
    RequestLoggingMiddleware,
    enabled=settings.REQUEST_LOG_ENABLED,
)


@app.middleware("http")
async def attach_request_cache(request: Request, call_next):
    """Give each HTTP request its own memoization bag for OP rebuilds."""
    token = begin_request_cache()
    try:
        return await call_next(request)
    finally:
        end_request_cache(token)


app.include_router(api_router)


@app.get("/health")
def health() -> dict:
    """Liveness plus light pool/cache stats for local and Railway checks."""
    return {
        "status": "ok",
        "pool": pool_stats(),
        "responseCache": cache_stats(),
        "rateLimitEnabled": settings.RATE_LIMIT_ENABLED,
        "responseCacheEnabled": settings.RESPONSE_CACHE_ENABLED,
    }


# The built bundle, not the source folder beside it. Pointing at `frontend/`
# would serve the raw tree — an unbuilt index.html and every source file with
# it — now that the frontend shares this repo. Absent unless someone has run a
# local build, since Vercel serves the real thing.
_FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if _FRONTEND_DIR.is_dir():
    app.mount(
        "/",
        StaticFiles(directory=str(_FRONTEND_DIR), html=True),
        name="frontend",
    )
