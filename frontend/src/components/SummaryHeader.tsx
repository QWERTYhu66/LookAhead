import { fmt, monthEnd, pctChange } from "@/lib/format";
import type { ForecastResponse } from "@/lib/types";

/** The big number: what you'll probably have spent by month-end, with its range. */
export function SummaryHeader({ f }: { f: ForecastResponse }) {
  const vsLast = pctChange(f.total.predicted, f.total.last_month);
  return (
    <section className="flex flex-col gap-1">
      <p className="text-caption">Likely spend by {monthEnd(f.as_of)}</p>
      <h1 className="text-display tabular">{fmt(f.total.predicted)}</h1>
      <p className="text-body text-muted tabular">
        somewhere between {fmt(f.total.low)} and {fmt(f.total.high)}
      </p>
      <p className="text-body tabular">
        Spent so far {fmt(f.total.spent_so_far)} · {f.days_left} days left · last month {fmt(f.total.last_month)}
        {vsLast && <span className="text-muted"> ({vsLast})</span>}
      </p>
    </section>
  );
}
