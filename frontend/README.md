# LookAhead frontend

Next.js + TypeScript + Tailwind. The root route is a no-login market-news research brief for challenge 4.2.4, “News headlines and the stock market.”

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run build -- --webpack
```

The root page provides the presentation surface for the `stocknews/` ML results. It loads `GET /api/stocknews`, a local route that reads `../stocknews/results.json`, and displays the historical Dow-direction score, simple baselines, held-out metrics, feature explanation, and limitations. The current experiment is not a live crawler or ticker-specific predictor; the UI says results are unavailable until `stocknews/baseline.py` has generated the file.

The page intentionally does not create fake predictions or fake live data when model output is unavailable.

Important files:

```text
src/app/page.tsx                market inputs, prediction result, evidence, baseline comparison
src/app/api/stocknews/route.ts  reads the committed/local stocknews results artifact
src/app/globals.css             warm paper-and-ink market brief visual system
src/lib/useScrollAnimations.ts  Lenis, GSAP reveals, range scrubbing, and interactions
src/lib/types.ts                shared types and exact disclaimer
```

The required disclaimer remains: “This project is a prototype and is not financial advice.”
