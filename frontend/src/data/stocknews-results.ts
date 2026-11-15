export type ReportedScore = {
  accuracy: number;
  balanced_accuracy?: number;
  down_precision?: number;
  down_recall?: number;
  C?: number;
};

export type ReportedCategory = {
  accuracy: number;
  p_value_vs_always_up?: number;
  share_predicted_up?: number;
  days_with_category_headline?: number;
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

// Exact values from the generated stocknews/results.json and category_results.json.
// This remains a fallback for deployments where the small result artifacts are not copied.
export const reportedStockNewsResults: ReportedStockNewsResults = {
  result_source: "stocknews/results.json + category_results.json",
  baseline_always_up: { accuracy: 0.5079, balanced_accuracy: 0.5, down_precision: 0, down_recall: 0 },
  baseline_same_as_yesterday: { accuracy: 0.4577, balanced_accuracy: 0.4576, down_precision: 0.4492, down_recall: 0.4516 },
  model_vader_logreg: { accuracy: 0.4947, balanced_accuracy: 0.4884, down_precision: 0.4359, down_recall: 0.0914, C: 1 },
  model_tfidf_logreg: { accuracy: 0.4894, balanced_accuracy: 0.484, down_precision: 0.4407, down_recall: 0.1398, C: 1 },
  test_share_up: 0.5079,
  n_test_days: 378,
  category_results: {
    economy_business: { accuracy: 0.5079, p_value_vs_always_up: 0.5206, share_predicted_up: 1, days_with_category_headline: 0.963 },
    politics: { accuracy: 0.5159, p_value_vs_always_up: 0.3986, share_predicted_up: 0.987, days_with_category_headline: 1 },
    war_conflict: { accuracy: 0.4974, p_value_vs_always_up: 0.6784, share_predicted_up: 0.974, days_with_category_headline: 0.998 },
    crime_justice: { accuracy: 0.5079, p_value_vs_always_up: 0.5206, share_predicted_up: 1, days_with_category_headline: 0.955 },
    science_tech_health: { accuracy: 0.5079, p_value_vs_always_up: 0.5206, share_predicted_up: 0.989, days_with_category_headline: 0.898 },
    disaster_accident: { accuracy: 0.4974, p_value_vs_always_up: 0.6784, share_predicted_up: 0.979, days_with_category_headline: 0.865 },
  },
  all_categories_combined: { accuracy: 0.5344, p_value_vs_always_up: 0.1642, share_predicted_up: 0.751 },
};
