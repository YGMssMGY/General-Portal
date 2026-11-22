# Contributing to General Portal

Thank you for helping improve a self-hosted workspace platform for clubs, firms, and agencies.

## Contributor ladder

1. **First issue** — pick a `good first issue`, reproduce it, and describe a fix.
2. **Documentation** — fix a typo, clarify a command, or add a missing example.
3. **Tests** — add a unit or E2E case that catches a real regression.
4. **Feature** — propose a small, complete change with API, UI, five-locale strings, and tests.
5. **Maintainer** — sustained, high-quality contributions are reviewed for commit access.

Open an issue before starting anything larger than a single file so we can agree on scope.

## Local setup

Prerequisites: Node >= 22.12, pnpm 10, PostgreSQL 14+.

```bash
pnpm install
cp .env.example .env
pnpm config:check
MIGRATE_URL=<url> pnpm exec tsx scripts/migrate.ts
pnpm exec tsx scripts/seed.ts <slug>
pnpm dev
```

## Before opening a pull request

Run the full gate:

```bash
pnpm verify
pnpm test:unit
pnpm i18n:check
pnpm seo:check
pnpm security:check
```

Smoke and E2E need a live server with migrated and seeded databases:

```bash
SMOKE_EMAIL=... SMOKE_PASSWORD=... pnpm smoke http://localhost:3000
SMOKE_EMAIL=... SMOKE_PASSWORD=... E2E_PORTAL=<slug> pnpm test:e2e
```

## Rules

- pnpm only. No bun, no npm installs.
- Every API route calls `requireTenant`; every mutation checks a permission and object ownership.
- Workspace scope all queries; soft-delete by default.
- Validate request bodies with zod; use keyset pagination and integer cents for money.
- No raw SQL interpolation; Drizzle or parameterized queries only.
- No `process.env` outside the exempted paths listed in `AGENTS.md`.
- Every UI string uses `t()` with all five locale catalogues updated together: en-US, zh-CN, de-DE, fr-FR, es-ES.
- No emojis, no comments unless the reason is non-obvious.
- oxfmt (4 spaces) runs before every commit.
- Never commit `PORTING_GUIDE.md`.

## Commit conventions

Use Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`, `style:`. Group related changes; keep the tree clean.

## Security reports

Do not open a public issue for a vulnerability. Use GitHub Security Advisories or see `SECURITY.md`.
