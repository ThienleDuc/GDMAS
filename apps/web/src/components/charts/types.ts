/**
 * Kiểu dữ liệu typed view cho 6 Patterns chuỗi thời gian.
 * Nguồn: hợp đồng `contracts/schemas/patterns.json` (response `GET /api/v1/patterns`).
 *
 * Mọi trường đều optional để chịu được payload cũ/thiếu khóa; tầng component phải
 * kiểm tra bằng `resolvePatternView` + các hàm thuần trong `chart-data.ts` thay vì
 * chèn số liệu dự phòng tĩnh (I5 / kịch bản Demo Bước 3).
 */

export type TimeInterval = "day" | "week" | "month";
export type PatternStatus = "COMPUTED" | "PENDING";
export type BackendMetricStatus = "computed" | "insufficient_data";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TrendDirection = "increasing" | "decreasing" | "stable";

/** Payload PatternItem thô từ `getPatterns()` — `metrics` chưa được siết type bởi service. */
export interface PatternLike {
  id?: string;
  name?: string;
  type?: string;
  status?: PatternStatus | string;
  metrics?: Record<string, unknown> | null;
  period?: string;
}

export interface LineChartPoint {
  date: string;
  event_count: number;
  max_magnitude?: number | null;
  avg_magnitude?: number | null;
}

export interface ScatterPoint {
  id?: number;
  timestamp: string;
  magnitude: number;
  depth_km: number;
}

export interface MagnitudeBin {
  bin: string;
  count: number;
}

export interface TemporalMetrics {
  status?: BackendMetricStatus;
  interval?: TimeInterval;
  line_chart?: LineChartPoint[];
  scatter_plot?: ScatterPoint[];
  histogram?: { magnitude_bins?: MagnitudeBin[] };
  data_points?: number;
  avg_magnitude?: number | null;
  max_magnitude?: number | null;
  avg_depth?: number | null;
}

export interface TrendSeriesPoint {
  period: string;
  actual_value: number;
  trend_value?: number | null;
  is_complete?: boolean;
}

export interface TrendMetrics {
  status?: BackendMetricStatus;
  resample_freq?: string;
  interval?: TimeInterval;
  metric?: string;
  series?: TrendSeriesPoint[];
  moving_average_window?: number;
  slope?: number | null;
  intercept?: number | null;
  relative_slope?: number | null;
  p_value?: number | null;
  r_squared?: number | null;
  trend_direction?: TrendDirection;
  direction?: string;
  data_points?: number;
  complete_periods?: number;
}

export interface SeasonalLinePoint {
  cycle_index: number;
  period_label: string;
  seasonal_factor: number;
  seasonal_effect?: number | null;
}

export interface SeasonalityComponents {
  seasonal_line?: SeasonalLinePoint[];
  residual_variance?: number | null;
  seasonality_strength?: number | null;
  interpretation?: string;
}

export interface SeasonalityMetrics {
  status?: BackendMetricStatus;
  resample_freq?: string | null;
  interval?: TimeInterval | null;
  period?: number | null;
  components?: SeasonalityComponents;
  cycle_hours?: string | null;
  amplitude?: number | null;
  data_points?: number;
}

export type CorrelationVariable =
  | "magnitude"
  | "depth_km"
  | "latitude"
  | "longitude"
  | "daily_event_count";

export interface CorrelationMetrics {
  status?: BackendMetricStatus;
  variables?: CorrelationVariable[];
  matrix?: Array<Array<number | null>>;
  spearman_matrix?: Array<Array<number | null>>;
  method?: string;
  sample_size?: number;
  undefined_pairs?: Array<[string, string] | string[]>;
  note?: string;
  corr_mag_depth?: number | null;
  correlation_strength?: string;
}

export interface EvaluationMetrics {
  mae?: number;
  rmse?: number;
  baseline_mae?: number;
  confidence_level?: number;
  accuracy?: number;
  f1_score?: number;
  f1_macro?: number;
  classes?: string[];
}

export interface PredictionMetrics {
  target_date?: string | null;
  predicted_value?: number | null;
  lower_bound?: number | null;
  upper_bound?: number | null;
  model_name?: string | null;
  metric_name?: string | null;
  model_version?: string | null;
  evaluation_metrics?: EvaluationMetrics | null;
  generated_at?: string | null;
}

export interface ClassificationMetrics {
  target_date?: string | null;
  predicted_label?: string | null;
  probability_scores?: Record<string, number> | null;
  model_name?: string | null;
  model_version?: string | null;
  evaluation_metrics?: EvaluationMetrics | null;
}

/** Kết quả quyết định một pattern có dữ liệu để vẽ hay không. */
export interface PatternView {
  available: boolean;
  reason: string;
  metrics: Record<string, unknown>;
}
