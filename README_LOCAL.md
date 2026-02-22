# Running locally & deploying

## Mac — first-time setup

### Backend

```bash
cd budget-app/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Frontend

```bash
cd budget-app/frontend
npm install
```

---

## Mac — day-to-day: start and stop

From the repo root:

```bash
./start.sh   # starts backend (port 8000) + frontend (port 5173)
./stop.sh    # stops both
```

On startup, `start.sh` prints the URLs:

```
Local:     http://localhost:5173
Network:   http://192.168.x.x:5173
Memorable: http://MacBook-Pro.local:5173
API docs:  http://localhost:8000/docs
```

The **Memorable** URL works from any Bonjour-capable device on the same WiFi (Mac, iPhone, iPad).

---

## Mac — desktop launcher

The `Savings Tracker.app` launcher opens a Terminal, runs `start.sh`, and opens the app in the browser automatically.

To (re)build the `.app` from source after cloning on a new machine:

```bash
bash scripts/mac/build-launcher.sh
```

This compiles `scripts/mac/launcher.applescript` into `~/Applications/Savings Tracker.app`.
Drag it to the Dock or keep it in the Desktop.

---

## Mac — manual start (dev / hot-reload mode)

```bash
# Terminal 1 — backend
cd budget-app
backend/.venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — frontend
cd budget-app/frontend
npm run dev -- --host --port 5173
```

---

## Raspberry Pi / Docker deployment

Requires: Docker + Docker Compose installed on the Pi (or any Linux host).

### First time

```bash
git clone https://github.com/sneakybVer/budget-app.git
cd budget-app
docker compose up -d --build
```

- Frontend served by nginx on **port 80**
- Backend API on **port 8000**
- SQLite database persisted at `./data/budget.db` (outside containers, survives rebuilds)

### Updating

```bash
git pull
docker compose up -d --build
```

The `frontend/dist/` is pre-built and committed to the repo by GitHub Actions — no Node.js needed on the Pi.

### Private access from anywhere — Tailscale

Install [Tailscale](https://tailscale.com) on the Pi and your other devices (free for personal use). The app is then accessible at the Pi's Tailscale IP (e.g. `http://100.x.x.x`) from your phone, laptop, etc. — end-to-end encrypted, no public exposure.

---

## CI — automatic frontend builds

Pushing to `main` with changes in `frontend/src/` (or `vite.config.ts`, `package.json`, etc.) triggers the GitHub Actions workflow at `.github/workflows/build-frontend.yml`. It rebuilds `frontend/dist/` and commits it back automatically. The Pi just needs `git pull && docker compose up -d --build`.

---

## Data

- **Mac dev:** SQLite at `budget-app/budget.db` — excluded from git.
- **Docker:** SQLite at `budget-app/data/budget.db` — the `data/` directory is volume-mounted.
- On first run, **no accounts or values are seeded** — add your own via the Settings page.
- Back up `budget.db` manually to preserve your data.

---

## Running the tests

### Backend (pytest)

```bash
cd budget-app
backend/.venv/bin/pytest backend/tests -q
```

### Frontend (Vitest)

```bash
cd budget-app/frontend
npm test -- --run
```

---

## Backend layout

```
backend/
  Dockerfile
  main.py             # App init, CORS, router registration
  seed.py             # First-run seed data
  schemas.py          # Pydantic request schemas
  db.py               # SQLite engine + session
  models.py           # SQLModel table definitions
  routers/
    accounts.py       # /accounts
    values.py         # /values
    contributions.py  # /future_contributions
    summary.py        # /summary  /settings
```
