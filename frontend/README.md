# LookAhead frontend

Next.js + TypeScript + Tailwind. The root route is a no-login market-news research brief for challenge 4.2.4, “News headlines and the stock market.”

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run build -- --webpack
```

The interface accepts a ticker and forecast horizon, then calls:

```text
POST /api/market/predict
```

The response is expected to include a predicted direction, low/typical/high return range, confidence, model name/version, data timestamp, recent headlines, a simple baseline, held-out evaluation metadata, and source links. The page intentionally does not create fake predictions or fake live data when the endpoint is unavailable.

Important files:

```text
src/app/page.tsx             market inputs, prediction result, evidence, baseline comparison
src/app/globals.css          warm paper-and-ink market brief visual system
src/lib/useScrollAnimations.ts  Lenis, GSAP reveals, range scrubbing, and interactions
src/lib/types.ts             shared types and exact disclaimer
```

The required disclaimer remains: “This project is a prototype and is not financial advice.”
