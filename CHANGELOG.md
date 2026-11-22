# Changelog

All notable changes to this project are documented here. The format follows Keep a Changelog and versions follow Semantic Versioning.

## [2.0.0]

### Added

- Drizzle ORM with one PostgreSQL database per workspace and idempotent migrations
- Hand-rolled opaque Postgres sessions with rotation, instant revocation and nine sign-in providers
- YAML deployment registry with insert-only reconcile, presets and an operator CLI
- Ink operator console with typed confirmations, verified backups and an audit trail
- HTTPS operator API with a shared action registry, scoped tokens and zero-install curl/irm access
- Forty-plus modules: tasks, events, proposals, finance, meetings, polls, goals, dues, assets, workflows, attendance, participation and more
- Five-locale interface: en-US, zh-CN, de-DE, fr-FR, es-ES
- Scheduled backups, report generation, webhook delivery, retention and link-health jobs
- Technical SEO, structured data and a public marketing site
- Unit, smoke, E2E, operator, accessibility and quality gate suites

### Changed

- Replaced Prisma and NextAuth with Drizzle and the custom auth layer
- Navigation, branding, terminology and modules are now driven by `deployment.yaml`
- Landing page is statically generated and uses crawlable links

### Security

- Streamed magic-byte upload validation and SSRF-safe URL fetching
- Shared Postgres rate limits and origin-based CSRF checks
- Nonce-based Content Security Policy and HTTPS-only operator access
- Upgraded Next.js to the latest patched release
