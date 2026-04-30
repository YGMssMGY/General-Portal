#!/usr/bin/env bash
set -euo pipefail

BACKEND_PROFILE="${1:-dev}"
WITH_REDIS=false

usage() {
    echo "Usage: $0 [dev|demo] [--redis]"
    echo "  dev   - Start with PostgreSQL (default)"
    echo "  demo  - Start with H2 in-memory database"
    echo "  --redis - Enable Redis for sessions"
    exit 1
}

for arg in "$@"; do
    case "$arg" in
        dev|demo) BACKEND_PROFILE="$arg" ;;
        --redis) WITH_REDIS=true ;;
        -h|--help) usage ;;
        *) echo "Unknown argument: $arg"; usage ;;
    esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"
BACKEND_OUT="$BACKEND_DIR/backend.log"
BACKEND_ERR="$BACKEND_DIR/backend.err"
FRONTEND_OUT="$FRONTEND_DIR/vite.log"
FRONTEND_ERR="$FRONTEND_DIR/vite.err"
ENV_FILE="$ROOT/.env.local"

resolve_command() {
    local names=("$@")
    for name in "${names[@]}"; do
        if command -v "$name" &>/dev/null; then
            command -v "$name"
            return 0
        fi
    done
    return 1
}

test_port_open() {
    local port="$1"
    if command -v ss &>/dev/null; then
        ss -tlnp 2>/dev/null | grep -q ":$port " && return 0
    elif command -v netstat &>/dev/null; then
        netstat -tlnp 2>/dev/null | grep -q ":$port " && return 0
    elif command -v lsof &>/dev/null; then
        lsof -i ":$port" -sTCP:LISTEN &>/dev/null && return 0
    fi
    return 1
}

if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
fi

MVN=""
if MVN=$(resolve_command mvn); then
    :
elif [ -n "${MAVEN_HOME:-}" ] && [ -x "$MAVEN_HOME/bin/mvn" ]; then
    MVN="$MAVEN_HOME/bin/mvn"
elif [ -x "$ROOT/.tools/apache-maven-3.9.11/bin/mvn" ]; then
    MVN="$ROOT/.tools/apache-maven-3.9.11/bin/mvn"
fi

if [ -z "$MVN" ]; then
    echo "ERROR: Maven (mvn) was not found. Set MAVEN_HOME, add Maven to PATH, or restore .tools/apache-maven-3.9.11." >&2
    exit 1
fi

NPM=""
if NPM=$(resolve_command npm); then
    :
elif [ -n "${NODE_HOME:-}" ] && [ -x "$NODE_HOME/bin/npm" ]; then
    NPM="$NODE_HOME/bin/npm"
elif [ -n "${NVM_HOME:-}" ] && [ -x "$NVM_HOME/bin/npm" ]; then
    NPM="$NVM_HOME/bin/npm"
fi

if [ -z "$NPM" ]; then
    echo "ERROR: npm was not found. Install Node.js and ensure npm is on PATH, or set NODE_HOME/NVM_HOME." >&2
    exit 1
fi

if [ "$BACKEND_PROFILE" = "dev" ] && ! test_port_open 5432; then
    echo "ERROR: PostgreSQL is not listening on localhost:5432. Install/start PostgreSQL, or run with 'demo' profile for H2 fallback." >&2
    exit 1
fi

if $WITH_REDIS && ! test_port_open 6379; then
    echo "ERROR: Redis is not listening on localhost:6379. Start Redis, or omit --redis to use the simple in-memory cache." >&2
    exit 1
fi

if test_port_open 8080; then
    echo "ERROR: Port 8080 is already in use. Run ./stop-dev.sh or stop the existing backend." >&2
    exit 1
fi

if test_port_open 5173; then
    echo "ERROR: Port 5173 is already in use. Run ./stop-dev.sh or stop the existing frontend." >&2
    exit 1
fi

PROFILES="$BACKEND_PROFILE"
if $WITH_REDIS; then
    PROFILES="$BACKEND_PROFILE,redis"
fi

echo "Starting OrgFlow with backend profiles: $PROFILES"

nohup "$MVN" spring-boot:run -Dspring-boot.run.profiles="$PROFILES" \
    > "$BACKEND_OUT" 2> "$BACKEND_ERR" &
BACKEND_PID=$!

nohup "$NPM" run dev \
    > "$FRONTEND_OUT" 2> "$FRONTEND_ERR" &
FRONTEND_PID=$!

echo "Backend PID:  $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Frontend: http://localhost:5173"
echo "Backend health: http://localhost:8080/api/health"
echo "Backend log: $BACKEND_OUT"
echo "Frontend log: $FRONTEND_OUT"
