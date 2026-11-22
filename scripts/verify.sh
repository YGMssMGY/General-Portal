#!/usr/bin/env bash
set -eu
pnpm exec oxfmt --check .
pnpm lint
pnpm typecheck
pnpm build
pnpm test:unit
pnpm i18n:check
pnpm seo:check
pnpm security:check
printf "%s\n" "Static verification complete. Smoke, E2E, operator and accessibility suites need a live server plus migrated and seeded databases."
