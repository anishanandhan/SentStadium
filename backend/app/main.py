"""StadiumPulse FastAPI Application — entry point."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import TYPE_CHECKING

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import Settings, load_settings
from app.logging_config import setup_logging
from app.middleware.security_headers import security_headers_middleware
from app.routers import alerts, reasoning, upload, zones
from app.services.firestore_service import FirestoreService
from app.services.synthetic_data import SyntheticDataGenerator

if TYPE_CHECKING:
    from collections.abc import AsyncGenerator

logger = structlog.get_logger("app.main")

# ---------------------------------------------------------------------------
# Lifespan: start-up / shutdown
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan — initialize services, seed data on startup."""
    settings: Settings = app.state.settings

    setup_logging(debug=settings.debug)
    structlog.get_logger("app.main").info(
        "starting_stadiumpulse",
        mock_mode=settings.gemini_mock_mode,
        in_memory=settings.firestore_in_memory,
    )

    # Initialize Firestore service
    fs = FirestoreService(settings)
    app.state.firestore = fs

    # Seed synthetic data if the store is empty
    generator = SyntheticDataGenerator()
    zones_data = generator.generate_zones()
    await fs.seed_zones(zones_data)

    yield

    # Cleanup
    structlog.get_logger("app.main").info("shutting_down_stadiumpulse")


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------


def create_app(settings: Settings | None = None) -> FastAPI:
    """Create and configure the FastAPI application."""
    if settings is None:
        settings = load_settings()

    app = FastAPI(
        title="StadiumPulse API",
        description="AI-powered heat-and-crowd risk reasoning for stadium control rooms",
        version=settings.app_version,
        lifespan=lifespan,
    )
    app.state.settings = settings

    # --- Middleware ---

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Security headers (extracted middleware module)
    app.middleware("http")(security_headers_middleware)

    # Rate limiting
    limiter = Limiter(key_func=get_remote_address, default_limits=[settings.rate_limit])
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

    # --- Routers ---
    app.include_router(zones.router, prefix="/api", tags=["zones"])
    app.include_router(alerts.router, prefix="/api", tags=["alerts"])
    app.include_router(upload.router, prefix="/api", tags=["data"])
    app.include_router(reasoning.router, prefix="/api", tags=["reasoning"])

    # --- Health check ---
    @app.get("/api/health", tags=["health"])
    async def health_check(_request: Request) -> dict[str, str]:
        """Return service health status."""
        return {"status": "healthy", "service": "stadiumpulse"}

    return app


app = create_app()
