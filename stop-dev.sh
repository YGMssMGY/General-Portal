#!/usr/bin/env bash
set -euo pipefail

echo -e "\033[0;36m[general-portal] Stopping services...\033[0m"

PORTS=(3001 5173)
FOUND=false

for PORT in "${PORTS[@]}"; do
    PID=$(lsof -ti :$PORT 2>/dev/null || true)
    if [ -n "$PID" ]; then
        kill -9 $PID 2>/dev/null || true
        echo -e "\033[0;33m  Stopped PID $PID on port $PORT\033[0m"
        FOUND=true
    fi
done

# Also kill tsx / vite node processes
pkill -f "tsx watch.*index.ts" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

sleep 2

if [ "$FOUND" = false ]; then
    echo -e "\033[0;32mNothing to stop. No General Portal processes found.\033[0m"
else
    echo -e "\033[0;32m[general-portal] All services stopped.\033[0m"
fi
