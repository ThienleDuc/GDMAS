/**
 * Hợp đồng `GET /api/v1/system/status` — 7 Terminals + `last_run`.
 * Nguồn: contracts/schemas/system-status.json, docs/api/API.md §3.1,
 * contracts/README.md §3.5, docs/architecture.md §9.4 (ngưỡng stale/interrupted).
 */

export type ServiceHealth =
  | "running"
  | "active"
  | "idle"
  | "stopped"
  | "error"
  | "unknown";

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
