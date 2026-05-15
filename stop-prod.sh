#!/usr/bin/env bash
set -euo pipefail

echo "Stopping production services..."

FOUND=false

for PORT in 3001 5173; do
    PID=$(lsof -ti :$PORT 2>/dev/null || true)
    if [ -n "$PID" ]; then
        kill "$PID" 2>/dev/null && echo "  Stopped PID $PID on port $PORT" && FOUND=true
    fi
done

sleep 2

if ! $FOUND; then
    echo "Nothing to stop. No production processes found."
else
    echo "Production services stopped."
fi
