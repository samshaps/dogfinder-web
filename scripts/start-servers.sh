#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "[start-servers] Starting backend (FastAPI) and frontend (Next.js) in dev mode..."

# Backend
(
  cd "$ROOT_DIR/backend"
  if [[ -d "venv" ]]; then
    # shellcheck disable=SC1091
    source venv/bin/activate
  fi
  echo "[start-servers] Backend: uvicorn app:app on http://127.0.0.1:8000"
  python3 -m uvicorn app:app --reload --host 127.0.0.1 --port 8000 &
) 

# Frontend
(
  cd "$ROOT_DIR/frontend"
  if [[ ! -d node_modules ]]; then
    echo "[start-servers] Installing frontend deps (npm ci) ..."
    npm ci --no-audit --no-fund
  fi
  echo "[start-servers] Frontend: next dev on http://localhost:3000"
  npm run dev &
)

echo "[start-servers] Both servers starting in background. Use 'ps' to check or './scripts/restart-servers.sh' to restart."



