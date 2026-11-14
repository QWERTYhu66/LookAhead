// The shapes the app and the backend agree on. Same as TEAM.md (local notes). Change there first.

export type Persona = "student" | "family" | "business";

export const PERSONAS: { id: Persona; title: string; line: string }[] = [
  { id: "student", title: "Student", line: "First debit card. Will I make it to the end of the month?" },
  { id: "family", title: "Family", line: "Groceries, bills, kids. Where is this month going?" },
  { id: "business", title: "Small business", line: "Will I cover rent and suppliers before the month ends?" },
];

export type DemoProfile = { id: string; label: string; as_of: string; persona?: Persona };

export type Transaction = { date: string; amount: number; category: string; description?: string };

export type ForecastRequest = {
  transactions: Transaction[];
  as_of: string;
  budget?: { total?: number; by_category?: Record<string, number> };
};

export type CategoryForecast = {
  category: string;
  spent_so_far: number;
  predicted: number;
  low: number;
  high: number;
  last_month: number;
  note: string;
};

export type Totals = Omit<CategoryForecast, "category" | "note">;

export type Alert = { category: string; budget: number; projected: number; over_by: number; message: string };

export const DISCLAIMER = "This project is a prototype and is not financial advice.";

export type ForecastResponse = {
  as_of: string;
  days_left: number;
  categories: CategoryForecast[];
  total: Totals;
  alerts: Alert[];
  disclaimer: string;
};

export type Evaluation = {
  dataset: { name: string; users: number; train_period: string; test_period: string; source_url: string };
  mae: { model: number; last_month: number; same_pace: number };
  median_error: { model: number; last_month: number; same_pace: number };
  range_coverage: number;
  by_group: { group_name: string; groups: { label: string; n_users: number; model: number; last_month: number }[] }[];
  failures: { user_id: string; category: string; month: string; predicted: number; actual: number; why: string }[];
  disclaimer: string;
};

export const CATEGORY_LABEL: Record<string, string> = {
  groceries: "Groceries",
  eating_out: "Eating out",
  transport: "Transport & fuel",
  travel: "Trips",
  shopping: "Shopping",
  entertainment: "Fun & games",
  health: "Health",
  bills_services: "Phone, bills & services",
  other: "Other",
};

export function label(category: string): string {
  return CATEGORY_LABEL[category] ?? category;
}
