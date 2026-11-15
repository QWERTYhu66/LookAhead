# LookAhead

**A plain-language monthly spending calculator.** Enter take-home income and the amount you are thinking of spending. LookAhead gives you a practical spending target, shows what would be left, and compares your plan with current U.S. consumer-spending benchmarks.

> This project is a prototype and is not financial advice.

## What it does

LookAhead opens directly to a calculator. There is no email, name, account, bank login, or CSV requirement. Choose monthly or yearly take-home pay, enter planned monthly spending, and get a result based on a transparent 80% spending starting point from the CFPB's educational 50/30/20 framework. The page also shows BLS consumer-unit spending as context, not as a personal target.

The primary recommendation is intentionally explainable arithmetic. Leon will add the 2026 consumer-data backend layer later; until then, the UI does not fabricate a request from demo data or present the old historical model as current data.

## Current sources

The calculator uses the latest official releases available at build time: BLS Consumer Expenditure Survey 2024 (average consumer-unit spending of $78,535/year, or about $6,545/month), Census Income in the United States: 2025, CFPB's 50/30/20 educational framework, and the Federal Reserve's 2025 household savings report. Source links and assumptions are recorded in `.work/consumer-benchmarks-2026.md` and `.claude/docs/CREDITS.md`.

## Structure

```text
frontend/   Next.js calculator UI
backend/    FastAPI historical forecast engine
```

## Run locally

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
npm run typecheck
npm run lint
npm run build -- --webpack
```

The frontend can work without the backend; the calculator result remains available and the backend card explains that the 2026 data layer is not connected yet.
