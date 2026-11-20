/**
 * Hợp đồng 4 endpoint phân tích chuỗi thời gian (Pattern 1–4).
 * Nguồn: contracts/schemas/analysis.json ($defs), docs/api/API.md §3.3, contracts/README.md §3.6.
 * `status = insufficient_data` hoặc mảng rỗng → FE hiển thị Empty State, không bịa số.
 */

import type { AnalysisInterval, AnalysisStatus, ForecastMetric } from "./common.ts";

/* Pattern 1 — /analysis/temporal */
export interface TemporalLinePoint {
  date: string;
  event_count: number;
  max_magnitude?: number | null;
  avg_magnitude?: number | null;
}

export interface TemporalScatterPoint {
  id?: number;
  timestamp: string;
  magnitude: number;
  depth_km: number;
}

export interface MagnitudeBin {
  bin: string;
  count: number;
}

export interface TemporalResponse {
  success: boolean;
  data: {
    status?: AnalysisStatus;
    interval: AnalysisInterval;
    line_chart: TemporalLinePoint[];
    scatter_plot: TemporalScatterPoint[];
    histogram: { magnitude_bins: MagnitudeBin[] };
    stats?: {
      data_points?: number;
      avg_magnitude?: number | null;
      max_magnitude?: number | null;
      avg_depth?: number | null;
    };
  };
  message?: string;
}

/* Pattern 2 — /analysis/trend */
export interface TrendSeriesPoint {
  period: string;
  actual_value: number;
  trend_value?: number | null;
  is_complete?: boolean;
}

export interface TrendResponse {
  success: boolean;
  data: {
    status?: AnalysisStatus;
    resample_freq: "D" | "W" | "M";
    metric: ForecastMetric;
    series: TrendSeriesPoint[];
    slope?: number | null;
    intercept?: number | null;
    r_squared?: number | null;
    p_value?: number | null;
    trend_direction?: "increasing" | "decreasing" | "stable";
    sample_size?: number;
  };
  message?: string;
}

/* Pattern 3 — /analysis/seasonality */
export interface SeasonalLinePoint {
  cycle_index: number;
  period_label: string;
  seasonal_factor: number;
}

export interface SeasonalityResponse {
  success: boolean;
  data: {
    status?: AnalysisStatus;
    resample_freq?: string | null;
    period?: number | null;
    components: {
      seasonal_line: SeasonalLinePoint[];
      residual_variance?: number | null;
      seasonality_strength?: number | null;
      interpretation?: string;
    };
    data_points?: number;
  };
  message?: string;
}

/* Pattern 4 — /analysis/correlation */
export type CorrelationVariable =
  | "magnitude"
  | "depth_km"
  | "latitude"
  | "longitude"
  | "daily_event_count";

export interface CorrelationResponse {
  success: boolean;
  data: {
    status?: AnalysisStatus;
    variables: CorrelationVariable[];
    matrix: Array<Array<number | null>>;
    method: "pearson" | "spearman";
    sample_size?: number;
    note?: string;
  };
  message?: string;
}
