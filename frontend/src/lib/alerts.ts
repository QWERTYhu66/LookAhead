// Budget alerts, computed in the app so they update the moment you type. Same rule as the backend's.

import { label, type Alert, type CategoryForecast, type Totals } from "./types";
import { fmt } from "./format";

export type Budget = { total?: number; by_category: Record<string, number> };

export function computeAlerts(categories: CategoryForecast[], total: Totals, budget: Budget): Alert[] {
  const alerts: Alert[] = [];
  for (const c of categories) {
    const b = budget.by_category[c.category];
    if (b !== undefined && b > 0 && c.predicted > b) {
      alerts.push({
        category: c.category,
        budget: b,
        projected: c.predicted,
        over_by: c.predicted - b,
        message: `${label(c.category)} is on track to go over by ${fmt(c.predicted - b)}`,
      });
    }
  }
  if (budget.total !== undefined && budget.total > 0 && total.predicted > budget.total) {
    alerts.push({
      category: "total",
      budget: budget.total,
      projected: total.predicted,
      over_by: total.predicted - budget.total,
      message: `Total spending is on track to go over your budget by ${fmt(total.predicted - budget.total)}`,
    });
  }
  return alerts.sort((a, b) => b.over_by - a.over_by);
}
