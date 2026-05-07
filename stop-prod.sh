#!/usr/bin/env bash
set -euo pipefail

echo "Stopping production services..."

FOUND=false

JAVA_PIDS=$(pgrep -f "portal.*\.jar|orgflow" 2>/dev/null || true)
if [ -n "$JAVA_PIDS" ]; then
    echo "$JAVA_PIDS" | while read p; do
        kill "$p" 2>/dev/null && echo "  Stopped backend PID $p" && FOUND=true
    done
fi

PORT_PID=$(lsof -ti:8080 2>/dev/null || true)
if [ -n "$PORT_PID" ]; then
    kill "$PORT_PID" 2>/dev/null && echo "  Stopped process PID $PORT_PID on port 8080" && FOUND=true
fi

sleep 2

if ! $FOUND; then
    echo "Nothing to stop. No production processes found."
else
    echo "Production services stopped."
fi
