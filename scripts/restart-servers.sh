#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

"$ROOT_DIR/scripts/kill-servers.sh"
sleep 1
"$ROOT_DIR/scripts/start-servers.sh"




