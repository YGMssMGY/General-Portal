#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"
ENV_FILE="$ROOT/.env.local"

BACKEND_PROFILE="${BACKEND_PROFILE:-dev}"
DB_PROVIDER="${DB_PROVIDER:-postgres}"
WITH_REDIS="${WITH_REDIS:-false}"
FRONTEND_ONLY="${FRONTEND_ONLY:-false}"
BACKEND_PID=""
FRONTEND_PID=""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

cleanup() {
    echo -e "${YELLOW}[general-portal] Shutting down...${NC}"
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
        wait "$BACKEND_PID" 2>/dev/null || true
        echo -e "${YELLOW}[general-portal] Backend stopped (PID $BACKEND_PID)${NC}"
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
        wait "$FRONTEND_PID" 2>/dev/null || true
        echo -e "${YELLOW}[general-portal] Frontend stopped (PID $FRONTEND_PID)${NC}"
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM

while getopts "b:d:rfh" opt; do
    case $opt in
        b) BACKEND_PROFILE="$OPTARG" ;;
        d) DB_PROVIDER="$OPTARG" ;;
        r) WITH_REDIS="true" ;;
        f) FRONTEND_ONLY="true" ;;
        h) echo "Usage: $0 [-b profile] [-d postgres|sqlite] [-r] [-f]"; exit 0 ;;
        *) exit 1 ;;
    esac
done

echo -e "${CYAN}[general-portal] General Portal Dev Launcher${NC}"
echo -e "${CYAN}[general-portal] =====================${NC}"

if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
fi

if ! command -v java &>/dev/null; then
    if [ -n "${JAVA_HOME:-}" ]; then
        export PATH="$JAVA_HOME/bin:$PATH"
    fi
fi

if ! command -v java &>/dev/null; then
    echo -e "${RED}[general-portal] ERROR: Java not found${NC}"
    exit 1
fi
JAVA_VER=$(java -version 2>&1 | head -1)
echo -e "${CYAN}[general-portal] $JAVA_VER${NC}"

MVN_CMD=""
if [ -n "${MVN_CMD:-}" ] && [ -x "$MVN_CMD" ]; then
    MVN_CMD="$MVN_CMD"
elif command -v mvn &>/dev/null; then
    MVN_CMD="mvn"
elif [ -d "$ROOT/.tools" ]; then
    for d in "$ROOT/.tools"/maven*; do
        if [ -x "$d/bin/mvn" ]; then
            MVN_CMD="$d/bin/mvn"
            break
        fi
    done
fi

if [ -z "$MVN_CMD" ]; then
    echo -e "${RED}[general-portal] ERROR: Maven not found${NC}"
    exit 1
fi
echo -e "${CYAN}[general-portal] Maven: $MVN_CMD${NC}"

if [ "$FRONTEND_ONLY" != "true" ]; then
    if ! command -v npm &>/dev/null; then
        echo -e "${RED}[general-portal] ERROR: npm not found${NC}"
        exit 1
    fi
    echo -e "${CYAN}[general-portal] npm: $(command -v npm)${NC}"
fi

PROFILES="$BACKEND_PROFILE"
if [ "$BACKEND_PROFILE" = "" ]; then
    case "$DB_PROVIDER" in
        postgres) PROFILES="dev" ;;
        sqlite)   PROFILES="sqlite" ;;
    esac
fi

if [ "$PROFILES" = "dev" ]; then
    if ! nc -z localhost 5432 2>/dev/null; then
        echo -e "${RED}[general-portal] ERROR: PostgreSQL not on localhost:5432${NC}"
        exit 1
    fi
elif [ "$PROFILES" = "sqlite" ]; then
    mkdir -p "$ROOT/data"
fi

if [ "$WITH_REDIS" = "true" ]; then
    PROFILES="$PROFILES,redis"
    if ! nc -z localhost 6379 2>/dev/null; then
        echo -e "${RED}[general-portal] ERROR: Redis not on localhost:6379${NC}"
        exit 1
    fi
fi

export SPRING_PROFILES_ACTIVE="$PROFILES"
echo -e "${CYAN}[general-portal] Spring profiles: $PROFILES${NC}"

echo -e "${CYAN}[general-portal] Starting backend on port 8080...${NC}"
"$MVN_CMD" spring-boot:run -Dspring-boot.run.profiles="$PROFILES" -f "$BACKEND_DIR/pom.xml" &
BACKEND_PID=$!
echo -e "${CYAN}[general-portal] Backend PID: $BACKEND_PID${NC}"

if [ "$FRONTEND_ONLY" != "true" ]; then
    echo -e "${CYAN}[general-portal] Starting frontend on port 5173...${NC}"
    npm run dev --prefix "$FRONTEND_DIR" &
    FRONTEND_PID=$!
    echo -e "${CYAN}[general-portal] Frontend PID: $FRONTEND_PID${NC}"
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  General Portal is starting up!${NC}"
echo -e "${GREEN}============================================${NC}"
echo -e "  Frontend: ${GREEN}http://localhost:5173${NC}"
echo -e "  Backend:  ${GREEN}http://localhost:8080/api/health${NC}"
echo -e "  API Docs: ${GREEN}http://localhost:8080/api-docs${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services.${NC}"
echo ""

wait
