# LookAhead frontend

Next.js + TypeScript + Tailwind. The root route is a no-login market-news research brief for challenge 4.2.4, “News headlines and the stock market.”

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run build -- --webpack
```

The root page provides the presentation surface for the `stocknews/` ML results. Pressing **Run ML test** calls `POST /api/stocknews/run`, which executes `baseline.py` and `category_test.py` in the local `stocknews/` environment, then returns their fresh metrics. It displays the historical Dow-direction score, simple baselines, category test, feature explanation, and limitations. The current experiment is not a live crawler or ticker-specific predictor.

The page intentionally does not create fake predictions or fake live data when model output is unavailable.

Important files:

```text
src/app/page.tsx                market inputs, prediction result, evidence, baseline comparison
src/app/api/stocknews/route.ts      reads the committed/local stocknews result artifact
src/app/api/stocknews/run/route.ts  runs both StockNews ML scripts on button press
src/data/stocknews-results.ts  README-sourced results used when no JSON is committed
src/app/globals.css             warm paper-and-ink market brief visual system
src/lib/useScrollAnimations.ts  Lenis, GSAP reveals, range scrubbing, and interactions
src/lib/types.ts                shared types and exact disclaimer
```

The required disclaimer remains: “This project is a prototype and is not financial advice.”
