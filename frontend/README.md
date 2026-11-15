# LookAhead frontend

Next.js + TypeScript + Tailwind. The root route is a no-login salary-and-spending calculator.

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run build -- --webpack
```

The calculator uses current public benchmarks for its primary recommendation. Leon's 2026 consumer-data backend layer is intentionally not simulated with the old demo profiles; the UI has a clear placeholder for that future connection.

Important files:

```text
src/app/page.tsx             calculator inputs, math, benchmark comparison, backend status
src/app/globals.css          warm paper-and-ink calculator visual system
src/lib/api.ts               existing backend client and forecast contract
src/lib/types.ts             shared types and exact disclaimer
src/components/Disclaimer.tsx required disclaimer footer
```
