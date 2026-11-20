/**
 * Hợp đồng `GET /api/v1/health` — Database API + kết nối PostgreSQL.
 * Nguồn: contracts/schemas/health.json, docs/api/API.md §3.1.
 */

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
