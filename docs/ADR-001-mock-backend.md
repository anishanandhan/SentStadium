# ADR 001: Mock Backend for E2E Testing

## Context
Running End-to-End (E2E) tests in CI requires a hermetic environment to prevent flakiness and avoid hitting live services (like Gemini API or Firestore). 
The project already utilizes `GEMINI_MOCK_MODE` for the backend, but the frontend needs a way to be tested without requiring the backend to be running.

## Decision
We will mock the backend API at the network boundary using Playwright's `page.route` feature. 
This intercepts network requests made by the frontend and returns mock JSON responses, ensuring that the frontend can be tested in isolation.

## Consequences
- E2E tests are fast and reliable.
- CI pipeline does not require complex backend setup or secrets.
- We must maintain the mock payloads in the tests to match the actual backend API schema.
