#!/usr/bin/env bash
set -euo pipefail
pnpm exec oxfmt --check .
pnpm lint
pnpm typecheck
pnpm build
printf '%s\n' "Static verification complete. The smoke and E2E suites need a live server plus migrated and seeded databases, so they stay manual and CI-only."
