# LookAhead backend

Python API + a small scikit-learn model. The frontend (already built) calls these routes on port 8000.

## One-time setup

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

## Build the model (once, takes a while)

```powershell
.\.venv\Scripts\python.exe scripts\prepare_data.py
.\.venv\Scripts\python.exe scripts\train.py
.\.venv\Scripts\python.exe scripts\evaluate.py
.\.venv\Scripts\python.exe scripts\make_demo.py
.\.venv\Scripts\python.exe -m pytest -q
```

## Run it and look at it

The API is already a small website (Python only — no Node needed):

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Then open a browser:

- http://localhost:8000 — pick Student / Family / Business, type a budget
- http://localhost:8000/evaluation — model vs the two simple rules
- http://localhost:8000/api/health — `{ "ok": true }`

Aaron's prettier Next.js app lives in `frontend/`. When Node.js is installed, leave this API running and in a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. If the grey **cached** tag is gone, the app is using your model.

## Routes

| Route | What it does |
| --- | --- |
| `GET /api/health` | `{ "ok": true }` |
| `GET /api/demo-profiles` | the three demo people |
| `GET /api/demo-profiles/{id}` | that person's transactions |
| `POST /api/forecast` | month-end forecast |
| `GET /api/evaluation` | model vs two simple rules |

CORS defaults to `http://localhost:3000`. Set `CORS_ORIGINS` (comma-separated) for the deployed frontend.
