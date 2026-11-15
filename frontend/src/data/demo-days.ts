import reported from "./demo-days.json";

export type DemoHeadline = {
  text: string;
  vader: number;
};

export type DemoDay = {
  kind: "right" | "wrong";
  date: string;
  model_p_up: number;
  model_call: "up" | "down";
  actual: "up" | "down";
  top_headlines: DemoHeadline[];
};

export type OtherMarketTest = {
  market: string;
  target: string;
  features: string;
  always_up: number;
  model: number;
  p_value: number;
};

export type DemoDays = {
  note: string;
  model: string;
  p_up_min: number;
  p_up_max: number;
  share_days_predicted_up: number;
  down_days_caught: string;
  days: DemoDay[];
  other_markets_20_tests: OtherMarketTest[];
};

export const reportedDemoDays = reported as DemoDays;
