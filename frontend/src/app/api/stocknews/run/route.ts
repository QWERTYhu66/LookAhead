import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { reportedStockNewsResults } from "@/data/stocknews-results";

const execFileAsync = promisify(execFile);

async function readJson(file: string) {
  return JSON.parse(await fs.readFile(file, "utf8")) as Record<string, unknown>;
}

export async function POST() {
  const stocknewsRoot = path.resolve(process.cwd(), "../stocknews");
  const pythonCandidates = [
    path.join(stocknewsRoot, ".venv", "bin", "python"),
    "python3",
  ];
  let python = "python3";

  for (const candidate of pythonCandidates) {
    if (candidate === "python3") {
      python = candidate;
      break;
    }
    try {
      await fs.access(candidate);
      python = candidate;
      break;
    } catch {
      // Try the system interpreter if the project environment is unavailable.
    }
  }

  try {
    await execFileAsync(python, ["baseline.py"], {
      cwd: stocknewsRoot,
      timeout: 120_000,
      maxBuffer: 2 * 1024 * 1024,
    });
    await execFileAsync(python, ["category_test.py"], {
      cwd: stocknewsRoot,
      timeout: 120_000,
      maxBuffer: 2 * 1024 * 1024,
    });

    const results = await readJson(path.join(stocknewsRoot, "results.json"));
    const categories = await readJson(path.join(stocknewsRoot, "category_results.json"));
    return NextResponse.json(
      {
        ...results,
        result_source: "runtime: stocknews/baseline.py + category_test.py",
        category_results: categories.by_category,
        all_categories_combined: categories.all_categories_combined,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown ML test error.";
    return NextResponse.json(
      {
        error: `The StockNews ML test could not run. Check that the dataset exists at stocknews/data/Combined_News_DJIA.csv and that the Python dependencies are installed. ${detail}`,
        fallback: reportedStockNewsResults,
      },
      { status: 500 },
    );
  }
}
