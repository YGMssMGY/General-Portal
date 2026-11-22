# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 2.x     | Yes       |
| < 2.0   | No        |

## Reporting a vulnerability

Report privately through GitHub Security Advisories for this repository. Do not open a public issue, discussion, or pull request describing the vulnerability.

Include: the affected route or component, a minimal reproduction, the impact you observed, and any suggested fix. You should receive an acknowledgement within three working days and a status update at least weekly until resolution.

## What is in scope

- Authentication and session handling
- Tenant isolation and authorization
- Injection (SQL, template, command)
- Cross-site scripting and CSP bypasses
- Server-side request forgery in link preview and link health
- Upload validation and path traversal
- Operator API and SCIM token handling
- Secrets in logs or error responses

## Out of scope

- Reports that require a compromised operator machine or a leaked operator token
- Social engineering
- Denial of service caused by intentionally saturating your own deployment
- Issues in third-party identity providers

## Hardening summary

Production requires HTTPS; the middleware fails closed behind a proxy. Sessions are opaque Postgres rows, hashed at rest, rotated and instantly revocable. Every route resolves a tenant from the session and every mutation checks a permission. Uploads are sniffed by magic bytes and streamed with a size cap; untrusted URLs are resolved to validated IPs with pinned connections and redirect revalidation. A Postgres token bucket backs sensitive endpoints. The audit log is append-only with a SHA-256 hash chain.

## Security tooling

CI runs CodeQL, dependency review, OSSF Scorecard, Dependabot, frozen-lockfile installs, and `pnpm security:check`. Releases are signed and include an SBOM.
