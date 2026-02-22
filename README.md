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
  backend/
    main.py             # FastAPI app init, CORS, router registration
    seed.py             # Startup seed data
    schemas.py          # Pydantic request schemas
    db.py               # SQLite engine + session
    models.py           # SQLModel table definitions
    routers/
      accounts.py       # /accounts CRUD
      values.py         # /values CRUD
      contributions.py  # /future_contributions CRUD + upsert
      summary.py        # /summary + /settings
  frontend/
    src/
      pages/
        Progress.tsx    # Historical balances, bar/line chart toggle, entry form
        Forecast.tsx    # Projection chart, adjustable timeframe, what-if
```

## Quick start

```bash
cd budget-app
./start.sh
```

Open `http://localhost:5173` — or `http://MacBook-Pro.local:5173` from any device on your LAN.

See [README_LOCAL.md](README_LOCAL.md) for first-time setup instructions.

## GitHub

https://github.com/sneakybVer/budget-app
