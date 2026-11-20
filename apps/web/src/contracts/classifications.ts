/**
 * Hợp đồng `GET /api/v1/classifications` — Pattern 6, phân loại mức hoạt động t+1.
 * Nguồn: contracts/schemas/classifications.json, docs/api/API.md §3.3, contracts/README.md §3.7.
 * BE có thể trả nhãn dài ("Normal Activity") → FE chuẩn hoá sang `RiskLevel` ở tầng transform.
 */

import type { EvaluationMetrics } from "./common.ts";

export interface ClassificationsResponse {
  success: boolean;
  data: {
    target_date: string;
    predicted_label: string;
    probabilities?: Record<string, number>;
    probability_scores?: Record<string, number>;
    model_name?: string;
    model_version?: string;
    evaluation_metrics?: EvaluationMetrics;
    generated_at?: string;
  };
  message?: string;
}
