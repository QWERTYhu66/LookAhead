/** Placeholder shapes shown while a forecast loads. Same layout as the real thing, so nothing jumps. */
export function ForecastSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-8" aria-busy aria-label="Loading forecast">
      <div className="card flex flex-col gap-4 p-5">
        <div className="skeleton h-3 w-28" />
        <div className="skeleton h-12 w-48" />
        <div className="skeleton h-3 w-56" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton mt-2 h-10 w-full" />
      </div>
      <ul className="flex flex-col gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <li key={i} className="card flex items-center gap-4 p-4">
            <div className="skeleton h-9 w-9 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="skeleton h-3 w-1/3" />
              <div className="skeleton h-2.5 w-full" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
