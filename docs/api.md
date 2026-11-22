# API

Full schema: `GET /api/public/openapi.json` (generated description; portal cookie selects the database). Conventions: `{ success: true, data }` / `{ success: false, error }`, `?limit=` (1-100, default 50) with `?cursor=`, `X-Next-Cursor` on lists, `X-Unread-Count` on notifications.

## Auth

Session cookie `gp_session` (opaque Postgres session) or `Authorization: Bearer <token>`. Bearer works only where the handler passes `allowToken: true` plus explicit `scope` (the `requireTenant` token contract in `src/lib/tenant.ts`): required scopes must all be present on the token, and permission checks apply to token callers exactly as to sessions. The calendar feed is token-only via `?token=` with the `calendar:read` scope. Middleware rejects anonymous `/api/*` calls with 401 before handlers run.

## Pagination

Keyset over `(createdAt, id)`: pass the last `X-Next-Cursor` as `?cursor=`; empty header means exhausted. Invalid cursors are ignored, never 500s. `?limit=abc` falls back to the default.

## Error codes

| Status | Meaning                                                                        |
| ------ | ------------------------------------------------------------------------------ |
| 400    | Validation, bad UUID, invalid JSON body (`<path>: <message>` from `parseBody`) |
| 401    | Missing/invalid session or token                                               |
| 403    | Missing permission, missing scope, or disabled module                          |
| 404    | Unknown workspace, portal, provider, or row                                    |
| 429    | Rate limited (`Retry-After` seconds)                                           |
| 503    | Provider unavailable (generic message, no env names)                           |
| 500    | `Internal server error`, always generic                                        |

## Operator API

Discovery endpoints need no token and reveal no secrets: `GET /api/ops` (capability directory with ready-to-run `curl` and `irm` examples), `GET /api/ops/openapi.json`, `GET /api/ops/manifest.json` (agent tool definitions), and `GET /api/ops/health` (configuration booleans and portal count only). Portal API callers are unaffected by this surface.

Execution is `POST /api/ops/run` with `Authorization: Bearer <operator-token>`; HTTPS is required in production, and `OPS_ALLOWED_IPS` may restrict the source. The JSON body is:

```json
{
    "action": "site.health",
    "params": {},
    "confirmationToken": "optional",
    "typedValue": "optional",
    "yes": false,
    "idempotencyKey": "optional"
}
```

`action` is required; `params` defaults to `{}` and is validated by the action's zod schema. `idempotencyKey` may instead be sent as the `Idempotency-Key` header. Tokens are either the bootstrap `OPS_API_TOKEN` (all scopes) or a short-lived HMAC token issued by `ops.token` (60-86400 second TTL, signed with `OPS_SECRET`). Scopes are `ops:read`, `ops:deploy`, `ops:backup`, and `ops:danger`; each action declares the scopes it needs.

Success returns the standard envelope with `X-Action` and `X-Duration-Ms` headers. A destructive action returns `409` on the first call with `confirmationToken`, `preview`, `expiresAt` (five minutes), and `hint`; repeat with that token and `typedValue` equal to the target slug or email. An `idempotencyKey` replays the cached result for ten minutes. Every run, denial, and confirmation appends to `.tui-audit.log`.

| Status | Meaning                                                                    |
| ------ | -------------------------------------------------------------------------- |
| 400    | Invalid body, parameter validation, or confirmation mismatch               |
| 401    | Missing or invalid operator token                                          |
| 403    | Insufficient scope, non-HTTPS production request, or source IP not allowed |
| 404    | Unknown action                                                             |
| 409    | Confirmation required; token and preview in the body                       |
| 429    | Rate limited by the Postgres-backed guard                                  |
| 500    | Action failed (`ACTION_FAILED`)                                            |

### Action groups

There are 46 actions in the shared registry (`src/ops/registry.ts`). The same actions back the TUI Actions palette and this API.

| Group | Actions |
| --- | --- |
| site (7) | `site.list`, `site.show`, `site.config`, `site.health`, `site.add`, `site.remove`, `site.clone` |
| migrate (4) | `migrate.status`, `migrate.plan`, `migrate.apply`, `migrate.check` |
| backup and dr (5) | `backup.create`, `backup.list`, `backup.verify`, `backup.restore`, `dr.drill` |
| job (5) | `job.list`, `job.status`, `job.publish`, `job.retry`, `job.resume` |
| ops (6) | `ops.token`, `ops.whoami`, `ops.explain`, `ops.status`, `secret.rotate`, `cli.completion` |
| config (4) | `config.check`, `config.init`, `config.diff`, `config.doctor` |
| user (5) | `user.list`, `user.role`, `user.disable`, `user.sessions`, `user.revoke-all` |
| data (4) | `data.i18n-missing`, `data.export`, `data.import`, `compliance.export` |
| system (2) | `log.tail`, `bench` |
| webhook (1) | `webhook.replay` |
| danger (3) | `danger.drop-database` (alias of `site.remove`), `danger.revoke-sessions` (alias of `user.revoke-all`), `danger.disable-user` |

`dr.drill` restores the newest backup into a scratch database, compares row counts against the live database, then drops the scratch; it never touches live data. `ops.explain` returns any action's params, scopes, confirmation rule, and example commands. The `config.*` actions run `scripts/config.ts`. `ops.status` reports configuration flags without values. Destructive actions (`site.remove`, `backup.restore`, `data.import`, `user.revoke-all`, and the `danger.*` aliases) require typed confirmation.

## Endpoint catalogue

Grouped by domain. Permission is the `requireTenant` gate; reads need membership plus the module flag. `sess` means any authed session.

| Domain | Method + path | Gate |
| --- | --- | --- |
| account | `PUT /api/account/password`, `GET/DELETE /api/account/sessions` | sess |
| activity | `GET /api/activity` | sess |
| admin | `GET/POST /api/admin/users` | `manage_users` |
| agenda | `PUT/DELETE /api/agenda/[id]` | `manage_meetings` |
| analytics | `GET /api/analytics` | `view_reports` |
| api-tokens | `GET/POST /api/api-tokens`, `DELETE /api/api-tokens/[id]` | `manage_api_tokens` |
| approvals | `GET/POST /api/approvals`, `POST /api/approvals/[id]` | sess |
| assets | `GET/POST /api/assets`, `PUT/DELETE /api/assets/[id]`, `GET/POST /api/assets/[id]/loans`, `POST /api/assets/loans/[loanId]/return` | `manage_assets` on writes |
| attendance | `GET/POST /api/attendance`, `POST /api/attendance/record`, `GET /api/attendance/rate` | `check_in`; `manage_attendance` to record |
| audit | `GET /api/audit`, `GET /api/audit/export` | `view_audit` |
| badges | `GET /api/badges` | sess |
| auth | `GET /api/auth/login/[provider]`, `GET/POST /api/auth/callback/[provider]`, `GET/POST /api/auth/bcallback`, `POST /api/auth/logout`, `GET /api/auth/me`, `GET /api/auth/providers` | public (gated per provider) |
| auth otp | `POST /api/auth/otp/request`, `POST /api/auth/otp/verify`, `GET /api/auth/otp/consume` | public + rate limited |
| auth passkey | `POST /api/auth/passkey/register-options`, `register-verify`, `login-options`, `login-verify` | public + rate limited |
| auth password | `POST /api/auth/password/login`, `reset-request`, `reset-confirm` | public + rate limited |
| budget | `GET/POST /api/budget`, `GET /api/budget/overview`, `GET/PUT/DELETE /api/budget/[id]`, `POST /api/budget/[id]/approve`, `reconcile`, `spend` | sess read; `manage_budget` writes |
| calendar | `GET /api/calendar`, `GET /api/calendar/ical?token=` | sess; token with `calendar:read` |
| comments | `GET/POST /api/comments`, `DELETE /api/comments/[id]` | sess; author or `manage_all_tasks` to delete |
| cooperation | `GET/POST /api/cooperation`, `GET/PUT/DELETE /api/cooperation/[id]`, `POST /api/cooperation/[id]/review` | sess; `manage_partnerships` to review |
| custom-fields | `GET/POST /api/custom-fields`, `PUT/DELETE /api/custom-fields/[id]` | sess read; `manage_custom_fields` writes |
| data-import | `POST /api/data-import` | `manage_reports` |
| dashboard | `GET /api/dashboard` | sess |
| decisions | `GET/POST /api/decisions`, `PUT/DELETE /api/decisions/[id]` | `manage_decisions` writes |
| dues | `GET/POST /api/dues`, `POST/DELETE /api/dues/[id]` | `manage_dues` writes |
| events | `GET/POST /api/events`, `GET/PUT/DELETE /api/events/[id]`, `POST /api/events/[id]/approve`, `reject`, `GET/POST/DELETE /api/events/[id]/register`, annual-plan CRUD + link, `POST /api/events/teams-post/[id]` | `create_event` to create; `manage_all_events` to approve |
| files | `GET/POST /api/files`, `DELETE /api/files/[id]`, `GET/POST /api/files/[id]/versions`, `GET /api/files/download/[id]` | sess; `manage_files` for versions |
| finance | `GET /api/finance/summary`, `GET /api/finance/trends`, `GET/POST /api/finance/transactions`, `DELETE /api/finance/transactions/[id]` | sess read; `manage_finance` writes |
| goals | `GET/POST /api/goals`, `GET/PUT/DELETE /api/goals/[id]`, `POST /api/goals/[id]/progress` | `create_task` to create; `manage_goals` for goal writes |
| health | `GET /api/health` | public (`{ status: ok, version }`) |
| invitations | `GET/POST /api/invitations`, `DELETE /api/invitations/[id]`, `POST /api/auth/invitation/accept` | `manage_users`; accept is public with a signed token |
| kudos | `GET/POST /api/kudos`, `DELETE /api/kudos/[id]`, `GET /api/kudos/leaderboard` | `send_kudos` to send |
| link-preview | `GET /api/link-preview?url=` | sess, 10/min |
| links | `GET/POST /api/links`, `GET/DELETE /api/links/[id]` | sess |
| me | `GET /api/me`, `GET/PUT /api/me/prefs` | sess |
| meetings | `GET/POST /api/meetings`, `GET/PUT/DELETE /api/meetings/[id]`, `GET/POST /api/meetings/[id]/agenda`, `POST /api/meetings/[id]/code`, `GET/POST /api/meetings/[id]/minutes`, `POST/DELETE /api/meetings/[id]/rsvp`, `GET /api/meetings/[id]/rsvps` | `manage_meetings` / `manage_minutes` / `manage_attendance` for writes; RSVP sess |
| members | `GET /api/members`, `GET/PUT/DELETE /api/members/[id]`, `GET/POST /api/members/history`, `PUT/DELETE /api/members/history/[id]` | `view_members` read; `manage_users` writes |
| messages | `GET/POST /api/messages`, `GET/DELETE /api/messages/threads/[id]`, `POST .../reply`, `POST .../read` | `send_message` to write |
| metrics | `GET /api/metrics` | ops Bearer token (Prometheus text) |
| minutes | `PUT/DELETE /api/minutes/[id]`, `POST /api/minutes/[id]/action-items` | `manage_minutes` |
| my-work | `GET /api/my-work` | sess |
| notifications | `GET /api/notifications`, `POST /api/notifications/[id]/read`, `POST /api/notifications/read-all`, `GET/PUT /api/notification-prefs` | sess |
| participation | `GET /api/participation`, `GET /api/participation/leaderboard` | sess |
| polls | `GET/POST /api/polls`, `GET/PUT/DELETE /api/polls/[id]`, `POST /api/polls/[id]/vote` | sess |
| presence | `GET /api/presence` | sess (online users in the last five minutes) |
| proposals | `GET/POST /api/proposals`, `GET/PUT/DELETE /api/proposals/[id]`, `POST /api/proposals/[id]/approve`, `reject`, attachments `GET/POST`, templates CRUD | `create_proposal`; `approve_proposal` to review |
| public | `GET /api/public/portals`, `GET /api/public/showcase`, `GET /api/public/openapi.json` | public |
| purchase-requests | `GET/POST /api/purchase-requests`, `GET/DELETE /api/purchase-requests/[id]`, `POST .../[id]/review` | sess; `manage_purchase_requests` to review |
| reactions | `GET/POST /api/reactions` | sess |
| reports | `GET/POST /api/reports` | `view_reports` / `manage_reports` |
| saved-views | `GET/POST /api/saved-views`, `PUT/DELETE /api/saved-views/[id]` | sess |
| scim | `GET/POST /api/scim/v2/Users`, `GET/PATCH /api/scim/v2/Users/[id]`, `GET /api/scim/v2/Groups` | Bearer `SCIM_TOKEN` (501 when unset); portal from the request |
| search | `GET /api/search?q=` | sess, 10/min |
| settings | `GET/PUT /api/settings` | `manage_settings` |
| showcase | `GET/POST /api/showcase`, `PATCH/PUT/DELETE /api/showcase/[id]`, `PUT /api/showcase/reorder` | sess read; `manage_showcase` writes |
| subgroups | `GET/POST /api/subgroups`, `GET/PUT/DELETE /api/subgroups/[id]`, members `GET/POST/DELETE`, `DELETE .../members/[userId]`, `POST .../broadcast` | `manage_subgroups` (member-scoped leaves excepted) |
| tasks | `GET/POST /api/tasks`, `GET/PUT/DELETE /api/tasks/[id]`, subtasks/comments/attachments `GET/POST/DELETE`, `GET /api/tasks/occurrences`, `GET/POST /api/tasks/time` | `create_task`; `manage_time` for time |
| trash | `GET/POST/DELETE /api/trash`, `POST /api/trash/restore` | sess |
| usage | `GET /api/usage` | `view_reports` |
| volunteers | `GET/POST /api/volunteers`, `GET/PUT/DELETE /api/volunteers/slots`, `GET/POST/DELETE /api/volunteers/signups`, `GET /api/volunteers/hours`, `GET /api/volunteers/stats` | `manage_volunteer_slots` for slots |
| webhooks | `GET/POST /api/webhooks`, `PUT/DELETE /api/webhooks/[id]`, `POST /api/webhooks/[id]/test` | `manage_webhooks` |
| workflows | `GET/POST /api/workflows`, `GET/PUT/DELETE /api/workflows/[id]` | `manage_workflows` |
| workspace | `GET /api/workspace` | sess |

## Webhooks

`emitSideEffects` publishes `<entityType>.<action>` to active hooks whose event list matches; delivery runs on `webhook-deliver` with HMAC-SHA256 hex in `X-Portal-Signature` (when the hook has a secret), 10s timeout, 3 retries with backoff. Body: `{ event, payload, portal }`. Test delivery via `POST /api/webhooks/[id]/test`.

## Rate limits

100/min per IP plus path globally; 10/min for `/api/auth/*`, `/api/link-preview`, `/api/search`. 429 carries `Retry-After`.
