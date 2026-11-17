/**
 * Data Contracts giữa Backend FastAPI và Frontend React
 * Khớp 1:1 với contracts/schemas/ (nguồn sự thật duy nhất).
 *
 * Quy ước (I3): mọi timestamp là UTC ISO 8601 (hậu tố Z), mọi tọa độ là WGS84
 * (`latitude`, `longitude`). Endpoint chưa được Backend triển khai sẽ trả 404 —
 * tầng services dùng `getOptionalApi()` để trả `unavailable: true` thay vì mock.
 */

/** Tên sự kiện SSE: hợp của route đang chạy và đặc tả docs/api/API.md §3.5. */
export type SSEEventName =
  | "earthquake_detected"
  | "earthquake_alert"
  | "heartbeat"
  | "alert"
  | "ingestion_cycle_completed"
  | "database_cleared";

export interface SSEEventPayload<T = unknown> {
  event: SSEEventName;
  data: T;
  timestamp: string;
  /** Optional header `id:` — dùng chống trùng khi reconnect. */
  id?: string;
  /** Optional header `retry:` (ms) — FE vẫn dùng backoff cục bộ khi thiếu. */
  retry?: number;
}

/**
 * Bản ghi động đất theo payload thật của `GET /api/v1/earthquakes`.
 * Giữ các trường cũ (`time`, `depth`) để không phá vỡ consumer hiện có (RULE-03)
 * và bổ sung trường thật dạng optional.
 */
export interface EarthquakeContract {
  id: string | number;
  time?: string;
  depth?: number;
  latitude: number;
  longitude: number;
  magnitude: number;
  place: string;
  status?: "reviewed" | "automatic" | string;
  source?: string;
  source_event_id?: string;
  event_time?: string;
  depth_km?: number;
  magnitude_type?: string;
  source_url?: string;
  ingested_at?: string;
}

/** Kết quả dự báo t+1 — canonical snake_case, alias camelCase giữ để tương thích. */
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
}

/** Nhãn canonical của Pattern 6. */
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ForecastMetric = "event_count" | "avg_magnitude" | "max_magnitude";

export type ServiceHealth =
  | "running"
  | "active"
  | "idle"
  | "stopped"
  | "error"
  | "unknown";

/** 7 Terminals của GDMAS. */
export type ServiceKey =
  | "postgres"
  | "ingestion"
  | "analysis"
  | "clustering"
  | "prediction"
  | "api"
  | "frontend";

export const SERVICE_LABELS: Record<ServiceKey, string> = {
  postgres: "PostgreSQL",
  ingestion: "Ingestion",
  analysis: "Analysis",
  clustering: "Clustering",
  prediction: "Prediction",
  api: "Database API",
  frontend: "Frontend",
};

export interface ServiceStatus {
  status: ServiceHealth;
  last_run?: string | null;
  cycle?: string | null;
  uptime_seconds?: number | null;
  records_processed?: number | null;
  error_message?: string | null;
}

export interface HealthResponse {
  success: boolean;
  data: {
    status: "healthy" | "degraded" | "unhealthy";
    database: "connected" | "disconnected";
    version?: string;
    timestamp: string;
    uptime_seconds?: number;
  };
  message?: string;
}

export interface SystemStatusResponse {
  success: boolean;
  data: {
    /** BE có thể thiếu khoá nếu worker chưa từng chạy — FE coi là `unknown`. */
    services: Partial<Record<ServiceKey, ServiceStatus>>;
    data_feed?: {
      source?: string;
      total_events?: number;
      latest_event_time?: string | null;
    };
    generated_at?: string;
  };
  message?: string;
}

export interface ClusterSummary {
  cluster_id: number;
  center_latitude: number;
  center_longitude: number;
  event_count: number;
  avg_magnitude: number | null;
  max_magnitude: number | null;
  radius_km?: number | null;
  name?: string | null;
  dominant_place?: string | null;
}

export interface ClusterParameters {
  eps_km?: number;
  eps_degrees?: number;
  min_samples?: number;
  metric?: string;
}

export interface ClustersResponse {
  success: boolean;
  data: {
    algorithm?: string;
    parameters?: ClusterParameters;
    clusters_count?: number;
    noise_count?: number;
    calculated_at?: string;
    clusters: ClusterSummary[];
    noise_points?: Array<{
      event_id?: number;
      latitude: number;
      longitude: number;
    }>;
  };
  message?: string;
  last_updated?: string;
}

export type AnalysisInterval = "day" | "week" | "month";

export type AnalysisStatus = "computed" | "insufficient_data";

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

export interface EvaluationMetrics {
  mae?: number;
  rmse?: number;
  baseline_mae?: number;
  confidence_level?: number;
  accuracy?: number;
  f1_macro?: number;
  f1_score?: number;
  classes?: string[];
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

/** Kết quả bọc của endpoint chưa triển khai trên Backend (404) — không phải mock. */
export interface OptionalApiResult<T> {
  data: T | null;
  unavailable: boolean;
  status: number | null;
  message?: string;
}
