// Talks to the backend. If it's down (or not built yet), uses the saved results
// in src/mocks and says "cached". All requests forward the session token.
import { authHeaders } from "@/lib/auth";
import evaluationMock from "@/mocks/evaluation.json";
import businessMock from "@/mocks/forecast-business.json";
import familyMock from "@/mocks/forecast-family.json";
import studentMock from "@/mocks/forecast-student.json";
import profilesMock from "@/mocks/profiles.json";
import type { DemoProfile, Evaluation, ForecastRequest, ForecastResponse, Persona } from "./types";

export type Result<T> = { data: T; cached: boolean };

const MOCK_FORECAST: Record<Persona, ForecastResponse> = {
  student: studentMock as ForecastResponse,
  family: familyMock as ForecastResponse,
  business: businessMock as ForecastResponse,
};

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { ...init?.headers, ...authHeaders() },
    signal: AbortSignal.timeout(6000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function getProfiles(): Promise<Result<DemoProfile[]>> {
  try {
    const data = await get<DemoProfile[]>("/api/demo-profiles");
    if (data.length > 0) return { data, cached: false };
  } catch {}
  return { data: profilesMock as DemoProfile[], cached: true };
}

/** Which persona a demo profile belongs to: its own field, else the start of its id ("student_a" → student). */
export function personaOf(p: DemoProfile): Persona {
  if (p.persona) return p.persona;
  const head = p.id.split("_")[0];
  return head === "family" || head === "business" ? head : "student";
}

export async function getForecast(profile: DemoProfile): Promise<Result<ForecastResponse>> {
  try {
    const request = await get<ForecastRequest>(`/api/demo-profiles/${profile.id}`);
    const data = await get<ForecastResponse>("/api/forecast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    return { data, cached: false };
  } catch {
    return { data: MOCK_FORECAST[personaOf(profile)], cached: true };
  }
}

export async function getEvaluation(): Promise<Result<Evaluation>> {
  try {
    return { data: await get<Evaluation>("/api/evaluation"), cached: false };
  } catch {
    return { data: evaluationMock as Evaluation, cached: true };
  }
}
