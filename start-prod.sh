#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"
ENV_FILE="$ROOT/.env.production"
SKIP_FRONTEND="${SKIP_FRONTEND:-false}"

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'

echo -e "${CYAN}[orgflow] Production Launcher${NC}"
echo -e "${CYAN}[orgflow] =====================${NC}"

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}[orgflow] ERROR: .env.production not found${NC}"
    exit 1
fi

set -a; source "$ENV_FILE"; set +a

if [ "${ORGFLOW_DEMO_MODE:-}" = "true" ]; then
    echo -e "${RED}[orgflow] ERROR: ORGFLOW_DEMO_MODE=true not allowed in production${NC}"
    exit 1
fi

if [ "${MICROSOFT_CLIENT_ID:-demo-client-id}" = "demo-client-id" ] || [ -z "${MICROSOFT_CLIENT_ID:-}" ]; then
    echo -e "${RED}[orgflow] ERROR: MICROSOFT_CLIENT_ID not configured${NC}"
    exit 1
fi

if [ -n "${DEV_AUTH_PASSWORD:-}" ]; then
    echo -e "${RED}[orgflow] ERROR: DEV_AUTH_PASSWORD must be empty in production${NC}"
    exit 1
fi

if ! command -v java &>/dev/null; then
    echo -e "${RED}[orgflow] ERROR: Java not found${NC}"
    exit 1
fi
echo -e "${CYAN}[orgflow] Java: $(command -v java)${NC}"

MVN_CMD=""
if [ -n "${MVN_CMD:-}" ] && [ -x "$MVN_CMD" ]; then
    MVN_CMD="$MVN_CMD"
elif command -v mvn &>/dev/null; then
    MVN_CMD="mvn"
elif [ -d "$ROOT/.tools" ]; then
    for d in "$ROOT/.tools"/maven*; do
        if [ -x "$d/bin/mvn" ]; then MVN_CMD="$d/bin/mvn"; break; fi
    done
fi
if [ -z "$MVN_CMD" ]; then
    echo -e "${RED}[orgflow] ERROR: Maven not found${NC}"
    exit 1
fi
echo -e "${CYAN}[orgflow] Maven: $MVN_CMD${NC}"

echo -e "${CYAN}[orgflow] Building backend JAR...${NC}"
"$MVN_CMD" package -DskipTests -q -f "$BACKEND_DIR/pom.xml"

JAR=$(find "$BACKEND_DIR/target" -maxdepth 1 -name "*.jar" ! -name "*sources*" ! -name "*javadoc*" | head -1)
if [ -z "$JAR" ]; then
    echo -e "${RED}[orgflow] ERROR: No JAR found${NC}"
    exit 1
fi
echo -e "${CYAN}[orgflow] JAR: $(basename "$JAR")${NC}"

echo -e "${CYAN}[orgflow] Starting backend (prod)...${NC}"
java -jar "$JAR" --spring.profiles.active=default &
BACKEND_PID=$!
echo -e "${GREEN}[orgflow] Backend PID: $BACKEND_PID${NC}"

if [ "$SKIP_FRONTEND" != "true" ]; then
    if ! command -v npm &>/dev/null; then
        echo -e "${RED}[orgflow] ERROR: npm not found${NC}"
        exit 1
    fi
    echo -e "${CYAN}[orgflow] Building frontend...${NC}"
    (cd "$FRONTEND_DIR" && npm run build)
    echo -e "${GREEN}[orgflow] Frontend built to frontend/dist/${NC}"
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  OrgFlow PRODUCTION started!${NC}"
echo -e "${GREEN}============================================${NC}"
echo -e "  Backend: http://localhost:8080"
echo -e "  Health:  http://localhost:8080/api/health"
echo -e "${GREEN}============================================${NC}"
echo -e "  PID: $BACKEND_PID"

wait
