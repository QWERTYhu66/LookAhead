"""A small HTML view of the API, so you can see forecasts without Node.js."""

from __future__ import annotations

from app.schemas import ForecastResponse

LABEL = {
    "groceries": "Groceries",
    "eating_out": "Eating out",
    "transport": "Transport & fuel",
    "travel": "Trips",
    "shopping": "Shopping",
    "entertainment": "Fun & games",
    "health": "Health",
    "bills_services": "Phone, bills & services",
    "other": "Other",
    "student": "Student",
    "family": "Family",
    "business": "Small business",
}


def fmt(n: float) -> str:
    return f"{n:,.0f}"


def _bar(c, scale: float) -> str:
    def pct(v: float) -> float:
        return max(0.0, min(100.0, 100.0 * v / scale)) if scale else 0.0

    return f"""
    <div class="bar">
      <div class="range" style="left:{pct(c.low):.1f}%;width:{max(pct(c.high)-pct(c.low),1):.1f}%"></div>
      <div class="sofar" style="width:{pct(c.spent_so_far):.1f}%"></div>
      <div class="pred" style="width:{pct(c.predicted):.1f}%"></div>
      <div class="last" style="left:{pct(c.last_month):.1f}%"></div>
    </div>"""


def forecast_html(persona: str, profiles: list[dict], forecast: ForecastResponse, budget: float | None) -> str:
    scale = max(
        [1.0]
        + [max(c.high, c.last_month, c.predicted) for c in forecast.categories]
        + ([budget] if budget else [])
    )
    cards = []
    for c in forecast.categories:
        over = budget is not None and c.predicted > budget
        cards.append(
            f"""
            <article class="card">
              <div class="row">
                <strong>{LABEL.get(c.category, c.category)}</strong>
                <span class="tabular">{fmt(c.predicted)}</span>
              </div>
              {_bar(c, scale)}
              <p class="note">{c.note}</p>
              {"<p class='warn'>On track to go over this budget.</p>" if over else ""}
            </article>"""
        )
    switches = []
    for p in profiles:
        on = "on" if p["persona"] == persona else ""
        switches.append(f'<a class="chip {on}" href="/?persona={p["persona"]}">{LABEL.get(p["persona"], p["persona"])}</a>')

    total_warn = ""
    if budget is not None and forecast.total.predicted > budget:
        total_warn = f"<p class='warn'>Total is on track to go over by {fmt(forecast.total.predicted - budget)}.</p>"

    budget_val = "" if budget is None else str(int(budget))
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>LookAhead — {LABEL.get(persona, persona)}</title>
  <style>
    :root {{ --bg:#f6f4ef; --ink:#1c1916; --muted:#6b645c; --accent:#c45c26; --card:#fff; --sofar:#1c1916; --pred:#c45c26; }}
    * {{ box-sizing:border-box; }}
    body {{ margin:0; font:16px/1.45 system-ui,sans-serif; background:var(--bg); color:var(--ink); }}
    main {{ max-width:640px; margin:0 auto; padding:24px 16px 64px; display:flex; flex-direction:column; gap:16px; }}
    h1 {{ font-size:28px; margin:0; }}
    .muted, .note, .caption {{ color:var(--muted); font-size:14px; }}
    .tabular {{ font-variant-numeric:tabular-nums; }}
    .chips {{ display:flex; gap:8px; flex-wrap:wrap; }}
    .chip {{ padding:8px 12px; border-radius:999px; background:#e8e2d8; color:var(--ink); text-decoration:none; }}
    .chip.on {{ background:var(--ink); color:#fff; }}
    .hero {{ background:var(--card); border-radius:20px; padding:20px; }}
    .hero .big {{ font-size:36px; font-weight:700; }}
    .range-txt {{ color:var(--muted); }}
    .card {{ background:var(--card); border-radius:16px; padding:14px 16px; }}
    .row {{ display:flex; justify-content:space-between; gap:12px; }}
    .bar {{ position:relative; height:10px; background:#ece7df; border-radius:999px; margin:8px 0; overflow:hidden; }}
    .bar .pred {{ position:absolute; inset:0 auto 0 0; background:var(--pred); opacity:.35; border-radius:999px; }}
    .bar .sofar {{ position:absolute; inset:0 auto 0 0; background:var(--sofar); border-radius:999px; }}
    .bar .range {{ position:absolute; top:0; bottom:0; background:#c45c26; opacity:.15; }}
    .bar .last {{ position:absolute; top:-2px; bottom:-2px; width:2px; background:var(--muted); }}
    .warn {{ color:#9b2c1a; margin:6px 0 0; }}
    form {{ display:flex; gap:8px; }}
    input, button {{ font:inherit; padding:8px 12px; border-radius:10px; border:1px solid #d9d1c5; }}
    button {{ background:var(--ink); color:#fff; border:0; cursor:pointer; }}
    a {{ color:var(--accent); }}
    footer {{ color:var(--muted); font-size:12px; }}
  </style>
</head>
<body>
<main>
  <div class="chips">{''.join(switches)}<a class="chip" href="/evaluation">How good is it?</a></div>
  <section class="hero">
    <p class="muted">By the end of the month you'll probably spend about</p>
    <div class="big tabular">{fmt(forecast.total.predicted)}</div>
    <p class="range-txt tabular">somewhere between {fmt(forecast.total.low)} and {fmt(forecast.total.high)} · {forecast.days_left} days left</p>
    <p class="caption">Spent so far {fmt(forecast.total.spent_so_far)} · last month {fmt(forecast.total.last_month)} · units, not a real currency</p>
    {total_warn}
  </section>
  {''.join(cards)}
  <p class="caption">Solid = spent so far · tint = forecast · band = likely range · tick = last month.</p>
  <form method="get">
    <input type="hidden" name="persona" value="{persona}"/>
    <input type="number" name="budget" min="1" step="1" placeholder="Type a budget" value="{budget_val}"/>
    <button type="submit">Check</button>
  </form>
  <footer>{forecast.disclaimer}</footer>
</main>
</body>
</html>"""


def evaluation_html(ev: dict) -> str:
    mae = ev["mae"]
    med = ev["median_error"]
    max_mae = max(mae["model"], mae["same_pace"], mae["last_month"]) or 1

    def bar(v: float, strong: bool = False) -> str:
        w = 100 * v / max_mae
        bg = "#c45c26" if strong else "#c4b8a8"
        return f'<div class="bar"><div class="sofar" style="width:{w:.1f}%;background:{bg}"></div></div>'

    groups = []
    for g in ev["by_group"]:
        rows = []
        for row in g["groups"]:
            rows.append(
                f"<p>{row['label']} ({row['n_users']:,} people) — model {fmt(row['model'])} vs last-month rule {fmt(row['last_month'])}</p>"
            )
        groups.append(f"<section class='card'><h2>By {g['group_name']}</h2>{''.join(rows)}</section>")

    fails = []
    for f in ev["failures"]:
        fails.append(
            f"""<article class="card">
              <strong>{LABEL.get(f['category'], f['category'])}, {f['month']} · user {f['user_id']}</strong>
              <p class="tabular">predicted {fmt(f['predicted'])} · actual {fmt(f['actual'])}</p>
              <p class="note">{f['why']}</p>
            </article>"""
        )

    better = (mae["same_pace"] - mae["model"]) / mae["same_pace"] * 100
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>LookAhead — How good is it?</title>
  <style>
    body {{ margin:0; font:16px/1.45 system-ui,sans-serif; background:#f6f4ef; color:#1c1916; }}
    main {{ max-width:640px; margin:0 auto; padding:24px 16px 64px; display:flex; flex-direction:column; gap:16px; }}
    h1,h2 {{ margin:0 0 8px; }}
    .card {{ background:#fff; border-radius:16px; padding:16px; }}
    .bar {{ height:10px; background:#ece7df; border-radius:999px; overflow:hidden; margin:6px 0 12px; }}
    .bar .sofar {{ height:100%; }}
    .muted, .note {{ color:#6b645c; font-size:14px; }}
    .tabular {{ font-variant-numeric:tabular-nums; }}
    a {{ color:#c45c26; }}
  </style>
</head>
<body>
<main>
  <p><a href="/">← Forecast</a></p>
  <h1>How good is it?</h1>
  <p>Tested on {ev['dataset']['test_period']}, three months the model never saw, across {ev['dataset']['users']:,} people. Lower error is better. The model's average error is <strong>{better:.0f}% lower</strong> than the best simple rule.</p>
  <section class="card">
    <h2>Model vs two simple rules</h2>
    <p>Our model {fmt(mae['model'])}</p>{bar(mae['model'], True)}
    <p>Rule: same pace as so far {fmt(mae['same_pace'])}</p>{bar(mae['same_pace'])}
    <p>Rule: same as last month {fmt(mae['last_month'])}</p>{bar(mae['last_month'])}
    <p class="muted">Typical (median) error: model {fmt(med['model'])} · same pace {fmt(med['same_pace'])} · real value inside the range {ev['range_coverage']*100:.0f}% of the time.</p>
  </section>
  {''.join(groups)}
  <h2>Where it fails</h2>
  {''.join(fails)}
  <p class="muted">{ev['disclaimer']}<br/>Data: {ev['dataset']['name']}.</p>
</main>
</body>
</html>"""
