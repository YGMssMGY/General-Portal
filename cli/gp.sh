#!/bin/sh
set -eu

BASE="${GP_URL:-}"
TOKEN="${GP_TOKEN:-}"
ACTION="${1:-}"
RAW="${2:-}"
if [ -z "$RAW" ]; then RAW='{}'; fi

if [ -z "$BASE" ] || [ -z "$TOKEN" ]; then
    echo "Set GP_URL and GP_TOKEN. Example: GP_URL=https://portal.example GP_TOKEN=<token> gp site.list" >&2
    exit 3
fi
if [ -z "$ACTION" ]; then
    echo "Usage: gp <action|list|explain|run> [json]" >&2
    exit 2
fi

request() {
    curl -sS -X POST "$BASE/api/ops/run" \
        -H "Authorization: Bearer $TOKEN" \
        -H 'Content-Type: application/json' \
        -d "$1"
}

case "$ACTION" in
    list)
        curl -sS "$BASE/api/ops" -H "Authorization: Bearer $TOKEN"
        ;;
    explain)
        request "{\"action\":\"ops.explain\",\"params\":{\"action\":\"$RAW\"}}"
        ;;
    run)
        request "$RAW"
        ;;
    *)
        request "{\"action\":\"$ACTION\",\"params\":$RAW}"
        ;;
esac
