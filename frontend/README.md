# LookAhead — the app

Next.js + TypeScript + Tailwind + motion. Look and motion follow the apple-design guidelines (springs, press feedback on pointer-down, system font, translucent chrome, reduced-motion support).

```bash
npm install
npm run dev          # http://localhost:3000 — /api/* is forwarded to the backend on :8000
npm run typecheck
npm run lint
```

Works without the backend: it falls back to the saved results in `src/mocks/` and shows a small "cached" tag.

```
src/app/page.tsx              Who are you? → forecast → budget → alerts
src/app/evaluation/page.tsx   How good is it? (model vs. rules, by group, failures)
src/components/               one file per visual piece
src/lib/types.ts              the shapes shared with the backend
src/lib/api.ts                backend calls with mock fallback
src/lib/alerts.ts             budget → alerts (pure function)
src/mocks/                    saved results used when the backend is down
```
