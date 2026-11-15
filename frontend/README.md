# LookAhead frontend

Next.js + TypeScript + Tailwind. The root route is a no-login salary-and-savings calculator.

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run build -- --webpack
```

The calculator uses the CFPB 20% savings framework for its primary recommendation and projects annual savings plus one-month and three-month cushion milestones. It does not simulate current consumer data with old demo profiles.

Important files:

```text
src/app/page.tsx             calculator inputs, math, benchmark comparison, savings forecast
src/app/globals.css          warm paper-and-ink calculator visual system
src/lib/api.ts               existing backend client and forecast contract
src/lib/types.ts             shared types and exact disclaimer
src/components/Disclaimer.tsx required disclaimer footer
```
