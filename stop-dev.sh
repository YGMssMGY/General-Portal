#!/usr/bin/env bash
set -euo pipefail

stop_port() {
    local port="$1"
    local pids=""

    if command -v lsof &>/dev/null; then
        pids=$(lsof -ti ":$port" -sTCP:LISTEN 2>/dev/null || true)
    fi

    if [ -z "$pids" ] && command -v ss &>/dev/null; then
        pids=$(ss -tlnp 2>/dev/null | grep ":$port " | sed -E 's/.*pid=([0-9]+).*/\1/' | sort -u || true)
    fi

    if [ -z "$pids" ] && command -v netstat &>/dev/null; then
        pids=$(netstat -tlnp 2>/dev/null | grep ":$port " | awk '{split($NF,a,"/"); print a[1]}' | sort -u || true)
    fi

    for pid in $pids; do
        kill "$pid" 2>/dev/null || true
    done
}

ports=(5173 8080)
stopped_any=false

for port in "${ports[@]}"; do
    stop_port "$port"
done

sleep 2

remaining=false
for port in "${ports[@]}"; do
    if command -v lsof &>/dev/null && lsof -ti ":$port" -sTCP:LISTEN &>/dev/null; then
        remaining=true
        echo "WARNING: Some listeners are still present on port $port" >&2
    elif command -v ss &>/dev/null && ss -tlnp 2>/dev/null | grep -q ":$port "; then
        remaining=true
        echo "WARNING: Some listeners are still present on port $port" >&2
    fi
done

if $remaining; then
    exit 1
fi

echo "General Portal frontend/backend ports are stopped."
