#!/usr/bin/env bash
set -euo pipefail

echo "[kill-servers] Stopping local dev servers (frontend + backend)..."

# Try graceful pkill first
pkill -f "uvicorn app:app" 2>/dev/null || true
pkill -f "uvicorn main:app" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "node .*next" 2>/dev/null || true

# Also clear by ports in case processes were renamed
for PORT in 3000 3001 8000; do
  PIDS=$(lsof -ti tcp:${PORT} -sTCP:LISTEN 2>/dev/null || true)
  if [[ -n "${PIDS}" ]]; then
    echo "[kill-servers] Killing processes on port ${PORT}: ${PIDS}"
    kill -9 ${PIDS} 2>/dev/null || true
  fi
done

echo "[kill-servers] Done."



