export type ReportedScore = {
  accuracy: number;
  balanced_accuracy?: number;
  down_precision?: number;
  down_recall?: number;
};

export type ReportedCategory = {
  accuracy: number;
  p_value_vs_always_up?: number;
};

export type ReportedStockNewsResults = {
  result_source: string;
  baseline_always_up: ReportedScore;
  baseline_same_as_yesterday: ReportedScore;
  model_vader_logreg: ReportedScore;
  model_tfidf_logreg: ReportedScore;
  test_share_up: number;
  n_test_days: number;
  category_results: Record<string, ReportedCategory>;
  all_categories_combined: ReportedCategory;
};

// These values are transcribed from stocknews/README.md's reported 2015–2016 test run.
// They are a transparent fallback because the dataset and generated JSON are not committed.
export const reportedStockNewsResults: ReportedStockNewsResults = {
  result_source: "stocknews/README.md · reported test run",
  baseline_always_up: { accuracy: 0.508 },
  baseline_same_as_yesterday: { accuracy: 0.458 },
  model_vader_logreg: { accuracy: 0.495 },
  model_tfidf_logreg: { accuracy: 0.489 },
  test_share_up: 0.508,
  n_test_days: 378,
  category_results: {
    economy_business: { accuracy: 0.508 },
    politics: { accuracy: 0.516 },
    war_conflict: { accuracy: 0.497 },
    crime_justice: { accuracy: 0.508 },
    science_tech_health: { accuracy: 0.508 },
    disaster_accident: { accuracy: 0.497 },
  },
  all_categories_combined: { accuracy: 0.534, p_value_vs_always_up: 0.16 },
};
