# LookAhead backend

Data, model, and API for the LookAhead month-end spending forecast.

## Stack
Python 3.13 + `uv` · FastAPI · uvicorn · pandas · scikit-learn

## One-time setup (data + model)

```bash
uv sync                         # install dependencies
uv run python scripts/download_data.py   # ~72 MB from Hugging Face
uv run python scripts/prepare_data.py    # clean → data/processed/{daily,grid}.parquet
uv run python scripts/train_model.py     # gradient-boosted trees → models/*.joblib
uv run python scripts/evaluate.py        # held-out MAE vs rules → reports/evaluation.json
uv run python scripts/build_demo_profiles.py  # 3 demo customers → data/demo/
```

## Run the API

```bash
uv run python api/main.py        # :8000
# or
uv run lookahead-api
```

## API routes

| Route | Returns |
|---|---|
| `GET /api/demo-profiles` | `[{ id, label, as_of, persona }]` |
| `GET /api/demo-profiles/{id}` | `{ transactions, as_of }` (ForecastRequest) |
| `POST /api/forecast` | `ForecastResponse` (per-category forecast + alerts) |
| `GET /api/evaluation` | `Evaluation` (MAE vs rules, by group, failures) |

The frontend (`frontend/`) calls same-origin `/api/*`; Next.js rewrites them to this backend via `NEXT_PUBLIC_API_URL` (locally `http://localhost:8000`).

## Model contract

The forecast uses 8 numbers per category:
last month, 2 months ago, 3 months ago, their average, spent so far this month (as of day 20), day of month, days in month, category.
Three gradient-boosted trees give point / low (q=0.1) / high (q=0.9) rest-of-month spend.

Data is real, anonymized card transactions (Hugging Face `dllllb/transactions-gender`), Sep 2014 – Nov 2015 on a synthetic calendar (day 0 = 2014-09-01). Currency unstated — shown as plain units. Prototype, not financial advice.
