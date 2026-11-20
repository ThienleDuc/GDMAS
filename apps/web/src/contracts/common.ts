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
  /** BE truyền cả chuỗi lẫn object (errors.py:12) — nới type theo payload thật. */
  details?: string | Record<string, unknown> | null;
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

/** Runtime guard for the documented success envelope. */
export function isApiEnvelope<T = unknown>(value: unknown): value is ApiEnvelope<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "success" in value &&
    (value as { success: unknown }).success === true &&
    "data" in value
  );
}

/**
 * BE trả "rỗng" bằng HTTP 200 + `{success:false, data:null, message}` (audit B1).
 * Đây là kết quả hợp lệ, KHÔNG phải lỗi — UI phải vào Empty State, không ném ApiError.
 */
export function isApiEmptyEnvelope(value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.success === false &&
    candidate.data === null &&
    typeof candidate.message === "string" &&
    !("error" in candidate)
  );
}

/** Runtime guard for the documented error envelope. */
export function isApiErrorEnvelope(value: unknown): value is ErrorEnvelope {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.success !== false || typeof candidate.error !== "object" || candidate.error === null) return false;
  const error = candidate.error as Record<string, unknown>;
  return typeof error.code === "string" && typeof error.message === "string";
}

export function isErrorCode(value: string): value is ErrorCode {
  return (
    value === "VALIDATION_ERROR" ||
    value === "RESOURCE_NOT_FOUND" ||
    value === "DATA_SOURCE_UNAVAILABLE" ||
    value === "DATABASE_ERROR" ||
    value === "SERVICE_UNAVAILABLE" ||
    value === "INTERNAL_SERVER_ERROR"
  );
}

/** Strict UTC timestamp guard: only valid ISO 8601 timestamps ending in Z. */
export function isUtcTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

/** WGS84 bounds guard; partial filters are allowed, but each supplied value is bounded. */
export function isWgs84Bounds(value: unknown): value is {
  min_lat?: number;
  max_lat?: number;
  min_lon?: number;
  max_lon?: number;
} {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const bounds = value as Record<string, unknown>;
  const inRange = (key: string, min: number, max: number) =>
    bounds[key] === undefined ||
    (typeof bounds[key] === "number" && Number.isFinite(bounds[key]) && (bounds[key] as number) >= min && (bounds[key] as number) <= max);

  return (
    inRange("min_lat", -90, 90) &&
    inRange("max_lat", -90, 90) &&
    inRange("min_lon", -180, 180) &&
    inRange("max_lon", -180, 180) &&
    !(typeof bounds.min_lat === "number" && typeof bounds.max_lat === "number" && bounds.min_lat > bounds.max_lat) &&
    !(typeof bounds.min_lon === "number" && typeof bounds.max_lon === "number" && bounds.min_lon > bounds.max_lon)
  );
}
