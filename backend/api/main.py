"""LookAhead backend API.

Routes:
  GET    /api/demo-profiles        → list of demo profiles
  GET    /api/demo-profiles/{id}   → that profile's ForecastRequest (transactions + as_of)
  POST   /api/forecast             → ForecastRequest → ForecastResponse
  GET    /api/evaluation           → contents of reports/evaluation.json
"""

from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parents[1]
DEMO = ROOT / "data" / "demo"
REPORTS = ROOT / "reports"

try:
    from api.forecast import forecast  # type: ignore
except ImportError:  # run as a script: api/main.py
    from forecast import forecast  # type: ignore

app = FastAPI(title="LookAhead API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Transaction(BaseModel):
    date: str
    amount: float
    category: str | None = None
    description: str | None = None


class Budget(BaseModel):
    total: float | None = None
    by_category: dict[str, float] | None = None


class ForecastRequest(BaseModel):
    transactions: list[Transaction]
    as_of: str
    budget: Budget | None = None


class CategoryForecast(BaseModel):
    category: str
    spent_so_far: float
    predicted: float
    low: float
    high: float
    last_month: float
    note: str


class Totals(BaseModel):
    spent_so_far: float
    predicted: float
    low: float
    high: float
    last_month: float


class Alert(BaseModel):
    category: str
    budget: float
    projected: float
    over_by: float
    message: str


class ForecastResponse(BaseModel):
    as_of: str
    days_left: int
    categories: list[CategoryForecast]
    total: Totals
    alerts: list[Alert]
    disclaimer: str


DISCLAIMER = "This project is a prototype and is not financial advice."


def _load_profiles() -> list[dict]:
    path = DEMO / "profiles.json"
    if not path.exists():
        return []
    return json.loads(path.read_text())


def _load_transactions(profile_id: str) -> list[dict]:
    path = DEMO / f"{profile_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="profile not found")
    return json.loads(path.read_text())


def _compute_alerts(categories, total, budget) -> list[Alert]:
    alerts = []
    by_cat = budget.by_category if budget and budget.by_category else {}
    for c in categories:
        b = by_cat.get(c.category)
        if b is not None and b > 0 and c.predicted > b:
            alerts.append(Alert(
                category=c.category, budget=b, projected=c.predicted,
                over_by=round(c.predicted - b, 2),
                message=f"{c.category} is on track to go over by {c.predicted - b:,.0f}",
            ))
    if budget and budget.total is not None and budget.total > 0 and total.predicted > budget.total:
        alerts.append(Alert(
            category="total", budget=budget.total, projected=total.predicted,
            over_by=round(total.predicted - budget.total, 2),
            message=f"Total spending is on track to go over your budget by {total.predicted - budget.total:,.0f}",
        ))
    alerts.sort(key=lambda a: a.over_by, reverse=True)
    return alerts


@app.get("/api/demo-profiles")
def list_profiles():
    return _load_profiles()


@app.get("/api/demo-profiles/{profile_id}")
def get_profile(profile_id: str):
    profiles = {p["id"]: p for p in _load_profiles()}
    if profile_id not in profiles:
        raise HTTPException(status_code=404, detail="profile not found")
    transactions = _load_transactions(profile_id)
    return {
        "transactions": transactions,
        "as_of": profiles[profile_id]["as_of"],
    }


@app.post("/api/forecast", response_model=ForecastResponse)
def post_forecast(req: ForecastRequest):
    tx = [t.model_dump() for t in req.transactions]
    result = forecast(tx, req.as_of)

    # Build category forecasts + alerts.
    cat_forecasts = []
    for c in result["categories"]:
        cat_forecasts.append(CategoryForecast(
            category=c["category"], spent_so_far=c["spent_so_far"],
            predicted=c["predicted"], low=c["low"], high=c["high"],
            last_month=c["last_month"], note=c["note"],
        ))

    total = Totals(**result["total"])
    budget = req.budget.model_dump() if req.budget else None
    alerts = _compute_alerts(cat_forecasts, total, budget)

    return ForecastResponse(
        as_of=result["as_of"], days_left=result["days_left"],
        categories=cat_forecasts, total=total, alerts=alerts,
        disclaimer=DISCLAIMER,
    )


@app.get("/api/evaluation")
def get_evaluation():
    path = REPORTS / "evaluation.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="evaluation not found")
    return json.loads(path.read_text())


def run():
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


if __name__ == "__main__":
    run()
