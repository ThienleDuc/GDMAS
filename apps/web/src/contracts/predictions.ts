/**
 * Hợp đồng `GET /api/v1/predictions` — Pattern 5, dự báo định lượng t+1.
 * Nguồn: contracts/schemas/predictions.json, docs/api/API.md §3.3, contracts/README.md §3.7.
 * Alias phẳng `lower_bound`/`upper_bound` và camelCase giữ optional để tương thích payload `/patterns`.
 */

import type { EvaluationMetrics, ForecastMetric, RiskLevel } from "./common.ts";

export interface PredictionContract {
  target_date?: string;
  predicted_value?: number;
  confidence_interval?: { lower: number; upper: number };
  lower_bound?: number;
  upper_bound?: number;
  model_name?: string;
  model_version?: string;
  forecasted_metric?: ForecastMetric;
  targetDate?: string;
  predictedCount?: number;
  confidenceLower?: number;
  confidenceUpper?: number;
  riskLevel?: RiskLevel;
  evaluation_metrics?: EvaluationMetrics;
  generated_at?: string;
}

export interface PredictionsResponse {
  success: boolean;
  data: {
    target_date: string;
    forecasted_metric?: ForecastMetric;
    predicted_value: number;
    confidence_interval?: { lower: number; upper: number };
    lower_bound?: number;
    upper_bound?: number;
    confidence_level?: number;
    model_name?: string;
    model_version?: string;
    evaluation_metrics?: EvaluationMetrics;
    generated_at?: string;
  };
  message?: string;
}
