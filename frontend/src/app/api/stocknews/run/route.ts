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

async function readGeneratedResults(stocknewsRoot: string) {
  const results = await readJson(path.join(stocknewsRoot, "results.json"));
  const categories = await readJson(path.join(stocknewsRoot, "category_results.json"));
  return {
    ...results,
    result_source: "generated: stocknews/results.json + category_results.json",
    category_results: categories.by_category,
    all_categories_combined: categories.all_categories_combined,
  };
}

export async function POST() {
  const stocknewsRoot = path.resolve(process.cwd(), "../stocknews");
  const pythonCandidates = [
    process.env.STOCKNEWS_PYTHON,
    path.join(stocknewsRoot, ".venv", "bin", "python"),
    "python3",
  ].filter((candidate): candidate is string => Boolean(candidate));
  let runtimeError = "";

  for (const python of pythonCandidates) {
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
      const results = await readGeneratedResults(stocknewsRoot);
      return NextResponse.json(
        { ...results, result_source: "runtime: stocknews/baseline.py + category_test.py" },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      runtimeError = error instanceof Error ? error.message : "Unknown ML test error.";
    }
  }

  try {
    const generated = await readGeneratedResults(stocknewsRoot);
    return NextResponse.json(
      { ...generated, result_source: "saved test: Python unavailable in deployed runtime" },
      { headers: { "Cache-Control": "no-store", "X-LookAhead-Run-Status": "saved-artifact" } },
    );
  } catch {
    return NextResponse.json(
      {
        ...reportedStockNewsResults,
        result_source: "documented fallback: Python and generated files unavailable",
        run_error: runtimeError,
      },
      { headers: { "Cache-Control": "no-store", "X-LookAhead-Run-Status": "fallback" } },
    );
  }
}
