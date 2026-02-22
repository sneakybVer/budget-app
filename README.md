# Savings Tracker

A personal savings tracker for monitoring account balances, projecting future growth, and modelling what-if scenarios.

Runs locally on a Mac **or** self-hosted on a Raspberry Pi — private, no cloud dependency.

## Stack

| Layer      | Tech                                          |
|------------|-----------------------------------------------|
| Backend    | Python · FastAPI · SQLModel · SQLite          |
| Frontend   | TypeScript · React 18 · Vite 5 · Recharts    |
| Deployment | Docker Compose · nginx · GitHub Actions CI   |
| Access     | Local LAN or Tailscale (private mesh VPN)     |

## Repo structure

```
budget-app/
  start.sh              # Start backend + frontend (Mac dev)
  stop.sh               # Stop both servers
  docker-compose.yml    # Pi / server deployment
  README_LOCAL.md       # First-time setup & deployment guide
  pytest.ini
  data/                 # Docker volume mount — SQLite lives here (gitignored)
  backend/
    Dockerfile
    main.py             # FastAPI app init, CORS, router registration
    seed.py             # Startup seed (AppSettings row only)
    schemas.py          # Pydantic request schemas
    db.py               # SQLite engine + session
    models.py           # SQLModel table definitions
    routers/
      accounts.py       # GET/POST/PATCH/DELETE /accounts
      values.py         # GET/POST/DELETE /values
      contributions.py  # GET/POST/DELETE /future_contributions (+ upsert)
      summary.py        # GET /summary · GET/PUT /settings
    tests/
      conftest.py       # In-memory SQLite fixture
      test_accounts.py
      test_values.py
      test_contributions.py
      test_summary.py
  frontend/
    Dockerfile
    nginx.conf          # SPA fallback + asset cache headers
    src/
      pages/
        Progress.tsx    # Historical balances, bar/line chart toggle, entry form
        Forecast.tsx    # Projection chart, adjustable timeframe, what-if
        Settings.tsx    # Account management, opening balances, savings target
      utils.ts          # Shared pure functions (fmt, date helpers)
      test/
        utils.test.ts
        Progress.test.tsx
        Forecast.test.tsx
    dist/               # Pre-built static assets (rebuilt by CI on push to main)
  scripts/
    mac/
      launcher.applescript   # Source for the Savings Tracker macOS .app
      build-launcher.sh      # Compiles launcher into ~/Applications/
  .github/
    workflows/
      build-frontend.yml     # Rebuilds dist/ and commits on frontend source changes
```

## Quick start — Mac (dev mode)

```bash
cd budget-app
./start.sh
```

Open `http://localhost:5173` — or `http://MacBook-Pro.local:5173` from any device on your LAN.

## Quick start — Raspberry Pi / Docker

```bash
# First time
git clone https://github.com/sneakybVer/budget-app.git
cd budget-app
docker compose up -d --build

# Subsequent deploys
git pull && docker compose up -d --build
```

Frontend on `:80`, backend API on `:8000`. SQLite persists in `./data/budget.db` outside the containers.
Access privately from anywhere via [Tailscale](https://tailscale.com).

## CI — frontend dist

Pushing changes to `frontend/src/` (or related config) on `main` automatically triggers a GitHub Actions workflow that rebuilds `frontend/dist/` and commits it back. The Pi only needs to `git pull && docker compose up -d --build` — no Node.js required on the device.

See [README_LOCAL.md](README_LOCAL.md) for first-time setup, test instructions, and data notes.

## GitHub

https://github.com/sneakybVer/budget-app
