/** Shown when the screen is rendering the saved forecast while the service is unavailable. */
export function CachedTag() {
  return (
    <span
      className="rounded-full border border-hairline bg-surface px-2 py-0.5 text-caption"
      title="The forecasting service is unavailable; showing the saved forecast."
    >
      Saved forecast
    </span>
  );
}
