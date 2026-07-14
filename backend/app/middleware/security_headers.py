"""Security headers middleware — Helmet-equivalent for FastAPI.

Applies defense-in-depth HTTP headers to every response:
- X-Content-Type-Options: prevents MIME-sniffing attacks
- X-Frame-Options: prevents clickjacking
- X-XSS-Protection: legacy XSS filter hint
- Referrer-Policy: controls referer leakage
- Permissions-Policy: disables unused browser APIs
- Content-Security-Policy: restricts resource loading origins
- Strict-Transport-Security: enforces HTTPS connections
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from fastapi import Request, Response

# Immutable header map — defined once, applied to every response.
_SECURITY_HEADERS: dict[str, str] = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data:; "
        "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com"
    ),
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
}


async def security_headers_middleware(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    """Inject security headers into every HTTP response."""
    response = await call_next(request)
    for header_name, header_value in _SECURITY_HEADERS.items():
        response.headers[header_name] = header_value
    return response
