#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"
ENV_FILE="$ROOT/.env.production"
SKIP_FRONTEND="${SKIP_FRONTEND:-false}"

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'

echo -e "${CYAN}[general-portal] Production Launcher${NC}"
echo -e "${CYAN}[general-portal] =====================${NC}"

[ ! -f "$ENV_FILE" ] && echo -e "${RED}[general-portal] ERROR: .env.production not found${NC}" && exit 1

set -a; source "$ENV_FILE"; set +a

[ -n "${DEV_AUTH_PASSWORD:-}" ] && echo -e "${RED}[general-portal] ERROR: DEV_AUTH_PASSWORD set${NC}" && exit 1

! command -v node &>/dev/null && echo -e "${RED}[general-portal] ERROR: Node.js not found${NC}" && exit 1
echo -e "${CYAN}[general-portal] Node.js $(node -v)${NC}"

echo -e "${CYAN}[general-portal] Building backend...${NC}"
(cd "$BACKEND_DIR" && npx tsc)

echo -e "${CYAN}[general-portal] Starting backend on port 3001...${NC}"
node "$BACKEND_DIR/dist/index.js" &
BACKEND_PID=$!
echo -e "${GREEN}[general-portal] Backend PID: $BACKEND_PID${NC}"

if [ "$SKIP_FRONTEND" != "true" ]; then
    echo -e "${CYAN}[general-portal] Building frontend...${NC}"
    (cd "$FRONTEND_DIR" && npm run build)
    echo -e "${GREEN}[general-portal] Frontend built to frontend/dist/${NC}"
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  General Portal PRODUCTION started!${NC}"
echo -e "${GREEN}============================================${NC}"
echo -e "  Backend: http://localhost:3001"
echo -e "  Health:  http://localhost:3001/api/health"
echo -e "${GREEN}============================================${NC}"
echo -e "  PID: $BACKEND_PID"

wait
