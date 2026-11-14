import { DISCLAIMER } from "@/lib/types";

/** The exact sentence the hackathon requires, at the bottom of every screen. */
export function Disclaimer() {
  return (
    <footer className="mx-auto w-full max-w-2xl px-4 py-6 text-caption">
      {DISCLAIMER} Amounts are in the dataset&apos;s unspecified units; dates come from a synthetic calendar.
    </footer>
  );
}
