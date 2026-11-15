import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { reportedStockNewsResults } from "@/data/stocknews-results";

async function readJson(candidates: string[]) {
  for (const file of candidates) {
    try {
      return JSON.parse(await fs.readFile(file, "utf8")) as Record<string, unknown>;
    } catch {
      // Try the next workspace layout.
    }
  }
  return undefined;
}

export async function GET() {
  const rootCandidates = [
    path.resolve(process.cwd(), "../stocknews"),
    path.resolve(process.cwd(), "stocknews"),
  ];
  const results = await readJson(rootCandidates.map((root) => path.join(root, "results.json")));
  const categories = await readJson(rootCandidates.map((root) => path.join(root, "category_results.json")));

  if (results) {
    return NextResponse.json(
      {
        ...results,
        result_source: categories ? "stocknews/results.json + category_results.json" : "stocknews/results.json",
        ...(categories
          ? {
              category_results: categories.by_category,
              all_categories_combined: categories.all_categories_combined,
            }
          : {}),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(reportedStockNewsResults, {
    headers: {
      "Cache-Control": "no-store",
      "X-LookAhead-Result-Source": "generated-artifact-fallback",
    },
  });
}
