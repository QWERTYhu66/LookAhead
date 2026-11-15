import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { reportedDemoDays } from "@/data/demo-days";

async function readJson(candidates: string[]) {
  for (const file of candidates) {
    try {
      return JSON.parse(await fs.readFile(file, "utf8"));
    } catch {
      // Try the next workspace layout.
    }
  }
  return undefined;
}

export async function GET() {
  const demo = await readJson([
    path.resolve(process.cwd(), "../stocknews/demo_days.json"),
    path.resolve(process.cwd(), "stocknews/demo_days.json"),
    path.resolve(process.cwd(), "src/data/demo-days.json"),
  ]);

  return NextResponse.json(demo ?? reportedDemoDays, {
    headers: { "Cache-Control": "no-store" },
  });
}
