import { DISCLAIMER } from "@/lib/types";

/** Quiet legal copy at the bottom of every screen. */
export function Disclaimer() {
  return (
    <footer className="mx-auto w-full max-w-[1040px] px-4 pb-8 pt-4 sm:px-6">
      <p className="text-caption max-w-prose">
        {DISCLAIMER} Forecasts are estimates based on the transaction history available in this workspace.
      </p>
    </footer>
  );
}
