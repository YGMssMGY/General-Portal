#!/usr/bin/env bash
set -euo pipefail

HAS_FAILURE=false

test_port() {
    local name="$1"
    local port="$2"
    local required="${3:-true}"

    local open=false
    if command -v nc &>/dev/null && nc -z localhost "$port" 2>/dev/null; then
        open=true
    elif command -v bash &>/dev/null && timeout 1 bash -c "echo >/dev/tcp/localhost/$port" 2>/dev/null; then
        open=true
    fi

    if $open; then
        echo "OK   $name is listening on port $port"
    elif $required; then
        echo "FAIL $name is not listening on port $port"
        HAS_FAILURE=true
    else
        echo "INFO $name is not listening on port $port"
    fi
}

test_http() {
    local name="$1"
    local url="$2"

    if command -v curl &>/dev/null; then
        local status
        if status=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$url" 2>/dev/null); then
            echo "OK   $name responded with HTTP $status"
        else
            echo "FAIL $name did not respond at $url"
            HAS_FAILURE=true
        fi
    elif command -v wget &>/dev/null; then
        if wget -q --spider --timeout=5 "$url" 2>/dev/null; then
            echo "OK   $name responded"
        else
            echo "FAIL $name did not respond at $url"
            HAS_FAILURE=true
        fi
    else
        echo "INFO curl or wget not found, skipping HTTP check for $name"
    fi
}

test_port "PostgreSQL" 5432
test_port "Redis (optional)" 6379 false
test_http "Backend health" "http://localhost:8080/api/health"
test_http "Frontend" "http://localhost:5173"

if $HAS_FAILURE; then
    exit 1
fi
