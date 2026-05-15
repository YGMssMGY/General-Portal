#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$ROOT/.env.local"
BACKEND_PID=""
FRONTEND_PID=""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

cleanup() {
    echo -e "${YELLOW}[general-portal] Shutting down...${NC}"
    [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null || true
    [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM

echo -e "${CYAN}[general-portal] General Portal Dev Launcher${NC}"
echo -e "${CYAN}[general-portal] =====================${NC}"

[ -f "$ENV_FILE" ] && set -a && source "$ENV_FILE" && set +a

if ! command -v node &>/dev/null; then
    echo -e "${RED}[general-portal] ERROR: Node.js not found${NC}"
    exit 1
fi
echo -e "${CYAN}[general-portal] Node.js $(node -v)${NC}"

echo -e "${CYAN}[general-portal] Starting Hono backend on port 3001...${NC}"
npx tsx watch "$ROOT/backend/src/index.ts" &
BACKEND_PID=$!
echo -e "${CYAN}[general-portal] Backend PID: $BACKEND_PID${NC}"

sleep 3

echo -e "${CYAN}[general-portal] Starting Vite frontend on port 5173...${NC}"
npm run dev --prefix "$ROOT/frontend" &
FRONTEND_PID=$!
echo -e "${CYAN}[general-portal] Frontend PID: $FRONTEND_PID${NC}"

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  General Portal is starting up!${NC}"
echo -e "${GREEN}============================================${NC}"
echo -e "  Frontend: ${GREEN}http://localhost:5173${NC}"
echo -e "  Backend:  ${GREEN}http://localhost:3001/api/health${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services.${NC}"
echo ""

wait
