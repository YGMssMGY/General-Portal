# Typed SDK

A zero-dependency typed fetch client lives in `src/lib/sdk/client.ts`. It has no build step and no package to install: import it from the repository or copy the single file into your own TypeScript project.

## Example

```ts
import { createPortalClient, PortalApiError } from "./client";

const client = createPortalClient({
    baseUrl: "https://portal.example.com",
    token: process.env.GP_TOKEN,
    portal: "main",
});

const workspace = await client.workspace();
const tasks = await client.tasks.list({ limit: 1, status: "todo" });
console.log(workspace.name, tasks.data.length, tasks.cursor);
```

`fetchImpl` accepts a custom `fetch` replacement for testing or for adding cookies.

## Methods

| Method                        | Returns                             |
| ----------------------------- | ----------------------------------- |
| `tasks.list(params?)`         | `{ data: Task[]; cursor }`          |
| `tasks.create(input)`         | `Task`                              |
| `events.list(params?)`        | `{ data: EventItem[]; cursor }`     |
| `proposals.list(params?)`     | `{ data: Proposal[]; cursor }`      |
| `members.list(params?)`       | `{ data: Member[]; cursor }`        |
| `finance.summary()`           | `FinanceSummary`                    |
| `meetings.list(params?)`      | `{ data: Meeting[]; cursor }`       |
| `messages.list(params?)`      | `{ data: MessageThread[]; cursor }` |
| `files.list(params?)`         | `{ data: FileItem[]; cursor }`      |
| `notifications.list(params?)` | `{ data: Notification[]; cursor }`  |
| `search({ q })`               | `SearchResult`                      |
| `workspace()`                 | `Workspace`                         |

All list methods accept `limit`, `cursor`, and `q`. `tasks.list` also accepts `status`, `assigneeId`, and `priority`. Unknown query keys are passed through.

## Authentication

The client supports two credentials:

- Bearer token: pass `token` to send `Authorization: Bearer <token>`. Tokens carry scopes such as `tasks:read` or `finance:read`, and permission checks still apply to token callers.
- Session cookie: omit `token` and supply a `fetchImpl` that sends the `gp_session` cookie. Browser callers already send it through `credentials: "include"`.

Pass `portal` to send the `portal=<slug>` cookie that selects the workspace database. Slugs must match `/^[a-z0-9][a-z0-9_-]{0,63}$/`; an invalid slug throws before any request. A missing cookie or token results in a 401.

## Errors

Every non-success response throws `PortalApiError`, which exposes `status` and `message`. Transport failures and malformed JSON also throw this class.

```ts
try {
    await client.tasks.create({ title: "Review minutes" });
} catch (error) {
    if (error instanceof PortalApiError) {
        console.error(error.status, error.message);
    } else {
        throw error;
    }
}
```

The API returns `{ success: false, error }` on failure. Status codes follow `docs/api.md`: 400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 429 rate limited, 500 internal error.

## Pagination

Lists return `{ data, cursor }`. The cursor is read from the `X-Next-Cursor` response header and is `null` when there are no more rows. Pass it back on the next call:

```ts
let cursor: string | null = null;
do {
    const page = await client.tasks.list({ limit: 50, cursor: cursor ?? undefined });
    for (const task of page.data) console.log(task.title);
    cursor = page.cursor;
} while (cursor !== null);
```

The real API uses keyset pagination over `(createdAt, id)`. Invalid cursors are ignored by the server rather than returning a 500.

## Verification

`scripts/sdk.ts` checks the client against a live server with `GP_URL`, `GP_TOKEN`, and `GP_PORTAL`. It prints `PASS` or `FAIL` per check and exits non-zero on failure. With `GP_URL` unset it prints usage and exits 0, which keeps it safe in continuous integration.
