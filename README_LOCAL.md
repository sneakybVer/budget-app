# Running locally (development)

## First-time setup

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

## Day-to-day: start and stop

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

## Desktop launcher

`Savings Tracker.app` on the Desktop opens a Terminal, runs `start.sh`, and opens the app in your browser automatically.

---

## Manual start (dev / reload mode)

If you want hot-reload on the backend:

```bash
# Terminal 1 — backend
cd budget-app
backend/.venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — frontend
cd budget-app/frontend
npm run dev -- --host --port 5173
```

---

## Data

- SQLite database lives at `budget-app/budget.db` — excluded from git.
- On first run, **no accounts or values are seeded** — add your own via the Settings page.
- Back up `budget.db` manually if you want to preserve your data.

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
