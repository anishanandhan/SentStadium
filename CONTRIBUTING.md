# Contributing to StadiumPulse

## Local Setup
See the ["Setup & Installation" section](../README.md#setup--installation) in the README for full instructions.

## Code Style
- Backend: `ruff check .` and `mypy --strict .` must pass with zero errors before committing.
- Frontend: `npx tsc --noEmit` and the configured linter must pass with zero errors before committing.
- No `any` types in TypeScript, no unvalidated `dict`/untyped data flowing through core logic in Python.

## Testing
- New features require corresponding tests, including at least one edge case.
- Run `pytest tests/ -v --cov=app` (backend) and `npx vitest run --coverage` (frontend) before submitting changes.

## Commit Style
- Use conventional commit prefixes where practical: `feat:`, `fix:`, `test:`, `docs:`, `chore:`.
