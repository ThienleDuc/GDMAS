/**
 * Kiểu dùng chung cho mọi hợp đồng API (Terminal 7 — Frontend).
 * Nguồn: docs/api/API.md §2 & §4, contracts/schemas/, docs/development/coding-conventions.md §3.
 * Quy ước I3: timestamp UTC ISO 8601 (hậu tố Z), toạ độ WGS84. Không dùng `any`.
 */

/** Metadata phân trang / cập nhật trong envelope thành công. */
export interface ApiMetadata {
  total?: number;
  page?: number;
  limit?: number;
  total_pages?: number;
  last_updated?: string;
}

/** Envelope thành công chuẩn: `{ success, data, metadata? }`. */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  metadata?: ApiMetadata;
  message?: string;
  last_updated?: string;
}

/** Mã lỗi chuẩn theo docs/api/API.md §4. */
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "RESOURCE_NOT_FOUND"
  | "DATA_SOURCE_UNAVAILABLE"
  | "DATABASE_ERROR"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_SERVER_ERROR";

export interface ApiErrorBody {
  code: ErrorCode | string;
  message: string;
  details?: Record<string, unknown>;
}

/** Envelope thất bại chuẩn: `{ success: false, error }`. */
export interface ErrorEnvelope {
  success: false;
  error: ApiErrorBody;
}

/** Kết quả endpoint chưa được Backend triển khai (404) — không phải mock (contracts/README.md §3.8). */
export interface OptionalApiResult<T> {
  data: T | null;
  unavailable: boolean;
  status: number | null;
  message?: string;
}

/** Nhãn canonical của Pattern 6. */
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/** Chỉ số được dự báo ở Pattern 5. */
export type ForecastMetric = "event_count" | "avg_magnitude" | "max_magnitude";

/** Khung gom nhóm thời gian của Pattern 1. */
export type AnalysisInterval = "day" | "week" | "month";

/** Trạng thái đủ/thiếu dữ liệu của kết quả phân tích. */
export type AnalysisStatus = "computed" | "insufficient_data";

/** Chỉ số đánh giá mô hình — thiếu thì UI hiển thị "chưa có dữ liệu kiểm định", không bịa số. */
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
