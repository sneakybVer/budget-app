# Savings Tracker

A personal savings tracker for monitoring account balances, projecting future growth, and modelling what-if scenarios.

Runs locally on a Mac and is accessible from any device on your home network.

## Stack

| Layer    | Tech                                        |
|----------|---------------------------------------------|
| Backend  | Python · FastAPI · SQLModel · SQLite        |
| Frontend | TypeScript · React 18 · Vite 5 · Recharts  |
| Runtime  | Local LAN — no cloud dependency             |

## Repo structure

```
budget-app/
  start.sh              # Start backend + frontend
  stop.sh               # Stop both servers
  README_LOCAL.md       # First-time setup guide
  pytest.ini            # Backend test configuration
  backend/
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
```

## Quick start

```bash
cd budget-app
./start.sh
```

Open `http://localhost:5173` — or `http://MacBook-Pro.local:5173` from any device on your LAN.

See [README_LOCAL.md](README_LOCAL.md) for first-time setup, test instructions, and data notes.

## GitHub

https://github.com/sneakybVer/budget-app
