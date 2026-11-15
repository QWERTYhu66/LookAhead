// Small line icons for the categories and personas. Drawn as simple strokes so they read at 20px.

const PATHS: Record<string, string> = {
  groceries: "M4 7h16l-1.5 11H5.5L4 7Zm4 0a4 4 0 0 1 8 0M9 11v4m6-4v4",
  eating_out: "M7 3v8m-2-8v4a2 2 0 0 0 4 0V3M7 11v10M16 3c-1.5 2-2 4-2 7h3v11M17 3v7",
  transport: "M5 16l1.5-6A2 2 0 0 1 8.4 8.5h7.2a2 2 0 0 1 1.9 1.5L19 16M4 16h16v3H4zM7 19v1.5M17 19v1.5",
  travel: "M3 14l9-2 9 2M12 12V4l2-1M9 20l3-3 3 3M12 12v5",
  shopping: "M6 8h12l1 13H5L6 8Zm3 0V6a3 3 0 0 1 6 0v2",
  entertainment: "M4 10a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3a4 4 0 0 1-4 4h-1l-3-2-3 2H8a4 4 0 0 1-4-4v-3ZM8 11v3M6.5 12.5h3M15.5 11.5h.01M17.5 13.5h.01",
  health: "M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10Z",
  bills_services: "M7 3h10v18l-2-1.5L13 21l-2-1.5L9 21l-2-1.5V3ZM9.5 8h5m-5 4h5m-5 4h3",
  other: "M6 12h.01M12 12h.01M18 12h.01",
  student: "M3 9l9-4 9 4-9 4-9-4Zm4 2v4c0 1.5 2.5 3 5 3s5-1.5 5-3v-4M21 9v5",
  family: "M8 7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm8 1a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM3 20v-4a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v4M14 20v-3a3 3 0 0 1 3-3h1a3 3 0 0 1 3 3v3",
  business: "M3 21h18M5 21V8l7-4 7 4v13M9 21v-5h6v5M9 11h.01M12 11h.01M15 11h.01",
  arrow: "M9 5l7 7-7 7",
  check: "M5 12l5 5 9-10",
  warn: "M12 4 3 20h18L12 4Zm0 6v4m0 3h.01",
};

export function Glyph({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  const d = PATHS[name] ?? PATHS.other;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={d} />
    </svg>
  );
}

/** A tinted disc with the category's glyph. The tint is the only place the category colour appears. */
export function CategoryGlyph({ category, size = 36 }: { category: string; size?: number }) {
  return (
    <span
      className="tint flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, ["--tint" as string]: `var(--tint-${category}, var(--tint-other))` }}
    >
      <Glyph name={category} size={Math.round(size * 0.55)} />
    </span>
  );
}
