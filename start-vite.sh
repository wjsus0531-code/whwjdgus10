#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "============================================"
echo "  Match Verdict - Vite Dev Server Launcher"
echo "============================================"

if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js is not installed. Please install Node.js 18+ first."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Starting Vite + API server at http://localhost:3000 ..."
if command -v open >/dev/null 2>&1; then
  (sleep 2 && open "http://localhost:3000") &
elif command -v xdg-open >/dev/null 2>&1; then
  (sleep 2 && xdg-open "http://localhost:3000") &
fi

npm run dev
