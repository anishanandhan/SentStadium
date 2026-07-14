"""Application configuration — loads from environment variables."""

from __future__ import annotations

import os
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Settings:
    """Immutable application settings loaded once at startup."""

    # General
    app_name: str = "StadiumPulse"
    app_version: str = "1.0.0"
    debug: bool = False

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: list[str] = field(default_factory=lambda: ["http://localhost:5173"])

    # Google Cloud
    gcp_project: str = ""
    gcp_location: str = "us-central1"

    # Gemini
    gemini_model: str = "gemini-2.5-flash"
    gemini_mock_mode: bool = True  # Use mock reasoning when True

    # Firestore
    firestore_emulator_host: str = ""  # Set to use emulator
    firestore_in_memory: bool = True  # Use in-memory store when True

    # Rate limiting
    rate_limit: str = "60/minute"

    # Upload limits
    max_upload_size_bytes: int = 10 * 1024 * 1024  # 10 MB
    max_upload_rows: int = 50_000


def load_settings() -> Settings:
    """Load settings from environment variables with sensible defaults."""
    return Settings(
        debug=os.getenv("DEBUG", "false").lower() == "true",
        cors_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
        gcp_project=os.getenv("GOOGLE_CLOUD_PROJECT", ""),
        gcp_location=os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1"),
        gemini_model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        gemini_mock_mode=os.getenv("GEMINI_MOCK_MODE", "true").lower() == "true",
        firestore_emulator_host=os.getenv("FIRESTORE_EMULATOR_HOST", ""),
        firestore_in_memory=os.getenv("FIRESTORE_IN_MEMORY", "true").lower() == "true",
        rate_limit=os.getenv("RATE_LIMIT", "60/minute"),
        max_upload_size_bytes=int(os.getenv("MAX_UPLOAD_SIZE_BYTES", str(10 * 1024 * 1024))),
        max_upload_rows=int(os.getenv("MAX_UPLOAD_ROWS", "50000")),
    )
