const nf = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });

/** Whole numbers with thousands separators. The dataset's currency is unknown, so no symbol. */
export function fmt(n: number): string {
  return nf.format(Math.round(n));
}

/** "+12%" / "−8%" change of a vs. b; null when b is 0. */
export function pctChange(a: number, b: number): string | null {
  if (b <= 0) return null;
  const p = ((a - b) / b) * 100;
  return `${p >= 0 ? "+" : "−"}${Math.abs(p).toFixed(0)}%`;
}

export function monthEnd(asOf: string): string {
  const d = new Date(asOf + "T00:00:00");
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toLocaleDateString("en", { month: "short", day: "numeric" });
}
