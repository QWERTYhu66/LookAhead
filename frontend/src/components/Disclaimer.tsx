import { DISCLAIMER } from "@/lib/types";

/** The exact sentence the hackathon requires, at the bottom of every screen. */
export function Disclaimer() {
  return (
    <footer className="mx-auto w-full max-w-[1040px] px-4 pb-8 pt-4 sm:px-6">
      <p className="text-caption max-w-prose">
        {DISCLAIMER} Amounts are in the dataset&apos;s unspecified units; dates come from a synthetic calendar. Built by team
        &ldquo;Claude&rsquo;s Plan&rdquo; for the Veritas AI High School Hackathon 2026.
      </p>
    </footer>
  );
}
