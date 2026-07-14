# Security Policy

## Reporting a Vulnerability

If you discover a security issue, please open a private security advisory via GitHub's "Security" tab on this repository, or contact [security@stadiumpulse.example.com](mailto:security@stadiumpulse.example.com).

## Threat Model & Mitigations

- **Secrets Management**: No API keys or credentials are committed to the repository. The `.env` file is gitignored. Production secrets (e.g. `GEMINI_API_KEY`) are managed via Google Secret Manager and mounted at runtime.
- **Input Validation**: Strict input validation at every API endpoint using Pydantic v2 (backend) and typed definitions. Path parameters (like `zone_id`) use regex validation (`^zone-[a-z0-9-]+$`) to prevent injection or directory traversal.
- **HTTP Hardening**: We employ a custom security headers middleware (Helmet-equivalent) injecting:
  - `Strict-Transport-Security` (HSTS)
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Content-Security-Policy` with a strict `default-src 'self'` baseline
- **Rate Limiting**: Layered rate limits via `slowapi` to prevent abuse (e.g. 60 requests/minute per client).
- **Prompt Injection Defense**: User-influenced text (e.g. uploaded filenames, any free-text fields) is sanitized and never interpolated raw into the Gemini prompt. The prompt structure is strictly controlled.
- **File Upload Safety**: MIME-type validation and a 10 MB file size limit on all uploads.
- **No Authentication Surface**: This is a direct-access control-room tool with no user accounts, meaning zero credentials to leak or account-takeover surface. In production, this would sit behind enterprise SSO.

## Supply Chain Security

- We enforce a secure supply chain:
  - `pip-audit` runs on every CI build to check Python dependencies.
  - `npm audit --audit-level=high` runs on every CI build to check frontend dependencies.
  - Dependencies are pinned with lockfiles (`package-lock.json`).

## Automated Scanning & CI

- **Static Analysis**: GitHub CodeQL (`security-extended`) runs on every push and weekly.
- **Secret Scanning**: Gitleaks action runs on every commit to catch accidentally committed secrets.
- **Least-Privilege CI**: All GitHub Actions workflows request only `contents: read` permissions.
