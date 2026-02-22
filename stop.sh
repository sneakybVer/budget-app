#!/usr/bin/env bash
# ── Savings Tracker – Stop Script ───────────────────────────────────────────
BASE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIDFILE="$BASE/.run/pids"

echo "Stopping Savings Tracker..."

# Kill by saved PIDs first
if [ -f "$PIDFILE" ]; then
  while IFS= read -r pid; do
    kill "$pid" 2>/dev/null && echo "  Killed PID $pid" || true
  done < "$PIDFILE"
  rm "$PIDFILE"
fi

# Also kill anything still holding the ports (handles stale/leaked processes)
for port in 8000 5173 5174; do
  pids=$(lsof -ti ":$port" 2>/dev/null)
  if [ -n "$pids" ]; then
    echo "$pids" | xargs kill -9 2>/dev/null && echo "  Cleared port $port" || true
  fi
done

echo "Done."

