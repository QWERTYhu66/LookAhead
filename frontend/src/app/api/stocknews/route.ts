import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { reportedStockNewsResults } from "@/data/stocknews-results";

export async function GET() {
  const candidates = [
    path.resolve(process.cwd(), "../stocknews/results.json"),
    path.resolve(process.cwd(), "stocknews/results.json"),
  ];

  for (const file of candidates) {
    try {
      const contents = await fs.readFile(file, "utf8");
      return NextResponse.json(JSON.parse(contents), { headers: { "Cache-Control": "no-store" } });
    } catch {
      // Try the next workspace layout. A missing results file is handled below.
    }
  }

  return NextResponse.json(reportedStockNewsResults, {
    headers: {
      "Cache-Control": "no-store",
      "X-LookAhead-Result-Source": "stocknews/README.md",
    },
  });
}
