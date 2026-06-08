#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Smart Loan Approval System — One-command launcher
# Usage:  bash start.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

# ── Python executable detection ───────────────────────────────────────────────
if command -v python3 &>/dev/null; then
  PY=python3
elif command -v python &>/dev/null; then
  PY=python
else
  echo "❌  Python not found. Install Python 3.9+ and re-run."
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║    Smart Loan Approval System  •  Starting up   ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── Install dependencies ──────────────────────────────────────────────────────
echo "📦 Installing Python dependencies…"
$PY -m pip install -r "$ROOT/requirements.txt" -q

# ── Start Flask backend ───────────────────────────────────────────────────────
echo "🚀 Starting Flask backend on http://localhost:5001 …"
cd "$BACKEND"
$PY app.py &
FLASK_PID=$!

# Wait for Flask to be ready
for i in {1..15}; do
  if curl -s http://localhost:5001/api/health &>/dev/null; then
    echo "✅ Backend is ready (PID $FLASK_PID)"
    break
  fi
  sleep 1
done

# ── Open frontend in browser ──────────────────────────────────────────────────
FRONTEND_URL="file://$FRONTEND/index.html"
echo ""
echo "🌐 Opening frontend: $FRONTEND_URL"

if command -v open &>/dev/null; then
  open "$FRONTEND_URL"           # macOS
elif command -v xdg-open &>/dev/null; then
  xdg-open "$FRONTEND_URL"       # Linux
elif command -v start &>/dev/null; then
  start "$FRONTEND_URL"          # Windows Git Bash
else
  echo "  Open manually: $FRONTEND_URL"
fi

echo ""
echo "──────────────────────────────────────────────────"
echo "  Backend  →  http://localhost:5001"
echo "  Frontend →  $FRONTEND_URL"
echo "  Press Ctrl+C to stop the server."
echo "──────────────────────────────────────────────────"
echo ""

# Keep script alive until Ctrl+C
trap "kill $FLASK_PID 2>/dev/null; echo ''; echo 'Server stopped.'; exit 0" INT
wait $FLASK_PID
