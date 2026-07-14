# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Playwright End-to-End testing suite with Axe accessibility scans.
- Lighthouse audits integrated.
- Mock backend capability in E2E tests for hermetic execution.
- Code-splitting on frontend for improved chunking.
- Community and governance files (CODE_OF_CONDUCT, CODEOWNERS, PULL_REQUEST_TEMPLATE).
- Enforced CI Coverage Thresholds (frontend: v8, backend: pytest-cov).

### Fixed
- Fixed mutation testing configuration.
- Improved error handling in boundary logic inside `synthetic_data.py`.
- Fixed color contrast on Hero Page.
- Added main landmark to root element for better accessibility parsing.
