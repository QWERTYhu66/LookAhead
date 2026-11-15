"""FastAPI app. Five routes the frontend already calls."""

from __future__ import annotations

import json
import os
from functools import lru_cache

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from app.forecast import forecast_request
from app.model import load_model
from app.paths import DATA_DEMO, EVALUATION_JSON, MODEL_PATH, PROFILES_JSON
from app.schemas import DemoProfile, ForecastRequest, ForecastResponse
from app.web import evaluation_html, forecast_html

app = FastAPI(title="LookAhead", version="0.1.0")

_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@lru_cache(maxsize=1)
def _bundle() -> dict:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"model not trained yet: {MODEL_PATH}")
    return load_model(MODEL_PATH)


def _profiles() -> list[dict]:
    if not PROFILES_JSON.exists():
        return []
    return json.loads(PROFILES_JSON.read_text(encoding="utf-8"))


@app.get("/", response_class=HTMLResponse)
def home(persona: str | None = Query(default=None), budget: float | None = Query(default=None)) -> str:
    profiles = _profiles()
    if not persona:
        cards = "".join(
            f'<p><a href="/?persona={p["persona"]}"><strong>{p["label"]}</strong></a></p>' for p in profiles
        )
        return (
            "<!doctype html><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
            "<body style='font:18px/1.5 system-ui;max-width:40rem;margin:2rem auto;padding:0 1rem'>"
            "<h1>LookAhead</h1><p>Who are you?</p>"
            f"{cards}<p><a href='/evaluation'>How good is it?</a></p>"
            "<p style='color:#6b645c;font-size:14px'>This project is a prototype and is not financial advice.</p>"
            "</body>"
        )
    match = next((p for p in profiles if p["persona"] == persona), None)
    if match is None:
        raise HTTPException(status_code=404, detail=f"no demo profile for {persona}")
    req = demo_profile(match["id"])
    try:
        resp = forecast_request(_bundle(), req)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return forecast_html(persona, profiles, resp, budget)


@app.get("/evaluation", response_class=HTMLResponse)
def evaluation_page() -> str:
    return evaluation_html(evaluation())


@app.get("/api/health")
def health() -> dict:
    return {"ok": True}


@app.get("/api/demo-profiles")
def demo_profiles() -> list[DemoProfile]:
    return [DemoProfile(**p) for p in _profiles()]


@app.get("/api/demo-profiles/{profile_id}")
def demo_profile(profile_id: str) -> ForecastRequest:
    path = DATA_DEMO / f"{profile_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"unknown profile {profile_id}")
    return ForecastRequest.model_validate_json(path.read_text(encoding="utf-8"))


@app.post("/api/forecast")
def forecast(req: ForecastRequest) -> ForecastResponse:
    try:
        bundle = _bundle()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return forecast_request(bundle, req)


@app.get("/api/evaluation")
def evaluation() -> dict:
    if not EVALUATION_JSON.exists():
        raise HTTPException(status_code=503, detail="evaluation.json not built yet")
    return json.loads(EVALUATION_JSON.read_text(encoding="utf-8"))
