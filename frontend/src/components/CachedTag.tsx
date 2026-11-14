/** Shown when the screen is rendering saved results instead of a live answer from the backend. */
export function CachedTag() {
  return (
    <span
      className="rounded-full border border-hairline bg-surface px-2 py-0.5 text-caption"
      title="The backend did not answer; showing the last saved result."
    >
      cached
    </span>
  );
}
