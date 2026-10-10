# Authentication

TODO(rename): `basis-auth` is the current provider id and is subject to change. Never call it "DevConnect" in code, config, or docs.

## Provider catalog

Flow providers (redirect via `GET /api/auth/login/[provider]`, return via `/api/auth/callback/[provider]`):

| Provider | Required env | Flow |
|---|---|---|
| `microsoft-entra-id` | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` (+ `MICROSOFT_TENANT_ID`, default `common`) | OIDC discovery on `login.microsoftonline.com/<tenant>/v2.0`, PKCE S256, UserInfo identity |
| `basis-auth` | all five `BASIS_*` vars (issuer, client id, client secret, redirect URI, resource) | OIDC with RFC 8707 `resource`, PKCE S256, UserInfo-first identity; see rules below |
| `google` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OIDC discovery on `accounts.google.com` |
| `github` | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | OAuth authorize (`read:user user:email`), PKCE S256, `/user` plus `/user/emails` fallback to primary verified |
| `oidc` | `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` (`OIDC_REDIRECT_URI` optional) | Generic OIDC discovery |
| `saml` | `SAML_ENTRY_POINT`, `SAML_ISSUER`, `SAML_CERT` | Redirect binding via `@node-saml/node-saml`, `RelayState` pending row |

Form and device providers:

| Provider | Required env | Routes |
|---|---|---|
| `password` (credentials) | none | `POST /api/auth/password/login`, reset request/confirm with OTP mail, `PUT /api/account/password` |
| `email-otp` | `SMTP_HOST`, `SMTP_FROM` | `POST /api/auth/otp/request` (`purpose: login` or `magic-link`), verify, consume |
| `passkey` | none (rpId and origin derive from base URL) | register-options, register-verify, login-options, login-verify under `/api/auth/passkey/` |

`GET /api/auth/providers?portal=<slug>` returns only enabled and portal-allowed flow providers plus the workspace name. `GET /api/auth/me` reports the current session.

## Basis-auth rules

- Scopes are exactly `openid profile email`, both in discovery metadata and the authorize URL.
- The `resource` parameter (RFC 8707, from `BASIS_AUTH_RESOURCE`) is always sent and must be configured; missing basis env returns generic 503.
- The redirect URI must match byte-for-byte. Discovery registers three URIs: the configured `BASIS_AUTH_REDIRECT_URI`, `<base>/api/auth/bcallback` (alias route, GET and POST), and `<base>/api/auth/callback/basis-auth`.
- Identity is UserInfo-first: `sub` comes from ID claims, but email, name, and picture come from `fetchUserInfo`. Missing email rejects the login.
- Email-join-once keyed by `sub` (`authIdentities` table): a known `sub` returns the linked user; a known email links once; a second `sub` for the same user fails closed with "linked to a different account, contact an administrator."
- PKCE S256 with `state` and `nonce` persisted in `authPending` per portal with a 10-minute TTL and prune-on-insert; callbacks consume (delete) the row and reject expired or unknown states.
- Outbound OIDC uses a 5-minute discovery cache; fetches carry abort timeouts (10s class). Membership gate applies after identity: no membership and no auto-join means `AccessDenied`.
- Role and disabled flags are re-read from Postgres on every request, not cached in the session.
- Sessions are opaque: `randomBytes(32)` base64url tokens, sha256 hash stored, expiry from `SESSION_TTL_HOURS`, `revokedAt` revocation, rotation on password change (other sessions revoked).
- Cookie flags: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age` from TTL, `Secure` only when the base URL is https. No `__Host-` prefix. No system proxy is used for any auth traffic.

## Env-gating invisibility

`enabledProviders()` (in `src/lib/auth/providers.ts`) admits a provider only when every required value is non-empty; `portalProviders(slug)` intersects that with the YAML list (or `AUTH_PROVIDERS_<SLUG>` override) and always appends `password`, `passkey`, `email-otp` when enabled. Missing env therefore leaves zero UI trace: no button, no provider entry, and direct hits get `AccessDenied` redirects or the generic `unavailable` 503. Logs warn once per portal plus provider; responses never name the missing variable.

## Passwords

scrypt with N=32768, r=8, p=1, 16-byte salt, 32-byte key (`scrypt$v=1$...` format, constant-time compare). Minimum 12 characters on change and reset. Reset is OTP-by-mail with hashed codes and single use; password change revokes all other sessions for the user.

## Passkeys

`@simplewebauthn/server` plus `@simplewebauthn/browser`, rpId and expected origin derived from the canonical base URL. Registration and login both use options then verify round trips; credentials link to the existing user row, so passkeys inherit membership, role, and disabled checks unchanged.

## SSO auto-join

When `auth.allowedDomains` in `deployment.yaml` is non-empty and the login email domain matches, the user is auto-joined with the system `member` role. Empty list disables auto-join and preserves the membership gate. The sign-in form gate additionally consults `ALLOWED_DOMAINS`.

## Sessions and tokens

`GET /api/account/sessions` lists active sessions; `DELETE /api/account/sessions` revokes by id (the Danger flows can revoke all sessions per portal). API tokens (`GET/POST /api/api-tokens`, `DELETE /api/api-tokens/[id]`, `manage_api_tokens`) carry free-form scopes up to 50 entries; the calendar feed honors `calendar:read` via `GET /api/calendar/ical?token=`. Token routes require `allowToken` plus explicit `scope` checks per handler.
