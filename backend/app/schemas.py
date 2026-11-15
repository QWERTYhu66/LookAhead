"""Request/response shapes. Same as frontend/src/lib/types.ts."""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.paths import DISCLAIMER


class Transaction(BaseModel):
    date: str
    amount: float
    category: str
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
    alerts: list[Alert] = Field(default_factory=list)
    disclaimer: str = DISCLAIMER


class DemoProfile(BaseModel):
    id: str
    persona: str
    label: str
    as_of: str
