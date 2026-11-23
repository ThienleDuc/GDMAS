/**
 * HTTP client dùng chung cho tầng services (Terminal 7 — Frontend).
 *
 * Ghi chú: module này bị thiếu trong repo (import `../lib/api-client` đã tồn tại từ trước
 * nhưng chưa có file) khiến `pnpm build` fail. Bổ sung theo RULE-03: chỉ thêm file mới,
 * không đổi chữ ký `fetchApi` mà các service đang dùng.
 */

import { isApiEmptyEnvelope, isApiEnvelope, isApiErrorEnvelope } from "../contracts/common.ts";

const envBase =
  typeof import.meta !== "undefined" && import.meta.env
    ? (import.meta.env.VITE_API_BASE_URL as string | undefined)
    : undefined;

const API_BASE_URL = (envBase ?? "http://localhost:8000").replace(/\/+$/, "");

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: string | Record<string, unknown> | null;

  constructor(message: string, status: number, code?: string, details?: string | Record<string, unknown> | null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

interface ExtractedApiError {
  message: string;
  code?: string;
  details?: string | Record<string, unknown> | null;
}

function extractApiError(payload: unknown, status: number): ExtractedApiError {
  if (isApiErrorEnvelope(payload)) {
    return {
      message: payload.error.message,
      code: payload.error.code,
      details: payload.error.details,
    };
  }
  if (typeof payload === "string" && payload.trim()) return { message: payload.trim() };
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const candidate = record.detail ?? record.message ?? record.error;
    if (typeof candidate === "string" && candidate.trim()) return { message: candidate.trim() };
    if (candidate !== undefined) return { message: JSON.stringify(candidate) };
  }
  return { message: `Yêu cầu thất bại (HTTP ${status}).` };
}

/**
 * Gọi REST API và trả về JSON đã parse.
 * Ném `ApiError` với `status = 0` khi không kết nối được máy chủ; error envelope chuẩn
 * giữ lại `code`/`details`, payload FastAPI legacy `detail` vẫn được hỗ trợ.
 */
export async function fetchApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    // Dữ liệu realtime: luôn lấy bản mới nhất, không dùng browser cache cho GET.
    response = await fetch(buildUrl(path), { ...init, headers, cache: init.cache ?? "no-store" });
  } catch {
    throw new ApiError(`Không thể kết nối đến API (${API_BASE_URL}).`, 0);
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const error = extractApiError(payload, response.status);
    throw new ApiError(error.message, response.status, error.code, error.details);
  }

  // Các endpoint collection trả envelope; một số response detail cũ trả trực tiếp entity.
  // Nếu payload có marker `success` thì buộc phải là envelope chuẩn, còn raw entity được giữ tương thích.
  // Empty envelope (200 + success:false + data:null + message) là kết quả rỗng hợp lệ.
  // Ngoại lệ: aggregate `GET /api/v1/patterns` rỗng không có khóa `data` — vẫn hợp lệ
  // theo API.md §2; `isApiEmptyEnvelope()` nhận diện cả hai shape (GAP-11).
  if (
    typeof payload === "object" &&
    payload !== null &&
    "success" in payload &&
    !isApiEnvelope(payload) &&
    !isApiEmptyEnvelope(payload)
  ) {
    throw new ApiError("Envelope phản hồi API không hợp lệ.", response.status);
  }

  return payload as T;
}
