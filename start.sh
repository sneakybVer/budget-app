#!/usr/bin/env bash
# ── Savings Tracker – Start Script ──────────────────────────────────────────
# Starts the FastAPI backend and Vite frontend dev server.
# The app will be accessible from any device on your local network at:
#   http://MacBook-Pro.local:5173

set -e

BASE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

BACKEND_PORT=8000
FRONTEND_PORT=5173
PIDFILE="$BASE/.run/pids"

mkdir -p "$BASE/.run"

# ── Kill any old instances ───────────────────────────────────────────────────
if [ -f "$PIDFILE" ]; then
  while IFS= read -r pid; do
    kill "$pid" 2>/dev/null || true
  done < "$PIDFILE"
  rm "$PIDFILE"
fi

# ── Backend ──────────────────────────────────────────────────────────────────
echo "Starting backend on port $BACKEND_PORT..."
cd "$BASE"
backend/.venv/bin/uvicorn backend.main:app \
  --host 0.0.0.0 \
  --port $BACKEND_PORT \
  > "$BASE/.run/backend.log" 2>&1 &
echo $! >> "$PIDFILE"

# ── Frontend ─────────────────────────────────────────────────────────────────
echo "Starting frontend on port $FRONTEND_PORT..."
cd "$BASE/frontend"
npm run dev -- --host --port $FRONTEND_PORT \
  > "$BASE/.run/frontend.log" 2>&1 &
echo $! >> "$PIDFILE"

# ── Wait for services ────────────────────────────────────────────────────────
echo "Waiting for services to start..."
sleep 3

LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "unknown")
HOSTNAME=$(scutil --get LocalHostName 2>/dev/null || hostname -s)

echo ""
echo "✅  Savings Tracker is running!"
echo ""
echo "   Local:     http://localhost:$FRONTEND_PORT"
echo "   Network:   http://$LOCAL_IP:$FRONTEND_PORT"
echo "   Memorable: http://$HOSTNAME.local:$FRONTEND_PORT"
echo ""
echo "   API docs:  http://localhost:$BACKEND_PORT/docs"
echo ""
echo "   PIDs saved to $PIDFILE"
echo "   Run stop.sh to shut down."
