import { DISCLAIMER } from "@/lib/types";

export function Disclaimer() {
  return (
    <footer className="mx-auto w-full max-w-[1120px] px-5 pb-6 pt-2 sm:px-7">
      <p className="text-xs leading-5 text-[#716f68]">
        {DISCLAIMER} Results are estimates based on public consumer-spending benchmarks and the numbers you enter.
      </p>
    </footer>
  );
}
