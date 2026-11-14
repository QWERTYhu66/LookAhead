# LookAhead

**A personalized month-end spending forecast with budget alerts — for a student with their first debit card, a family, or a small business.**

Veritas AI International High School Hackathon 2026 · AI + Finance track
**Team "Claude's Plan":** Aaron Hsueh (frontend) · Leon Pai (backend) · Ethan Huang (deploy, write-up, video)

> This project is a prototype and is not financial advice.

## What it does

You say who you are, pick a profile, and LookAhead tells you what you'll have spent by month-end, per category, with a likely range — and warns you when you're on track to overshoot your budget. The forecast is personal: the model only uses that person's own transaction history.

## Structure

```
frontend/   the web app (Next.js)
backend/    data, model and API (Python)
```

## How it works

1. **Data:** real, anonymized bank-card transactions from a public dataset (see `backend/data/README.md`), sorted into 9 everyday categories.
2. **Model:** a gradient-boosted tree model looks at 8 numbers about you — your last three months in a category, their average, what you've spent so far this month, and where we are in the month — and predicts how much more you'll spend before month-end.
3. **Honesty:** we test on three months the model never saw and compare it with two simple rules ("same as last month" and "same pace as so far"). Results, error by user group and real failure cases are shown in the app.

## Sources

Datasets, libraries and AI tools used (with links) will be listed here before submission.
