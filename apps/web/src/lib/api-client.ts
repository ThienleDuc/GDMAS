/**
 * HTTP client dùng chung cho tầng services (Terminal 7 — Frontend).
 *
 * Ghi chú: module này bị thiếu trong repo (import `../lib/api-client` đã tồn tại từ trước
 * nhưng chưa có file) khiến `pnpm build` fail. Bổ sung theo RULE-03: chỉ thêm file mới,
 * không đổi chữ ký `fetchApi` mà các service đang dùng.
 */

const envBase =
  typeof import.meta !== "undefined" && import.meta.env
    ? (import.meta.env.VITE_API_BASE_URL as string | undefined)
    : undefined;

const API_BASE_URL = (envBase ?? "http://localhost:8000").replace(/\/+$/, "");

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function extractErrorMessage(payload: unknown, status: number): string {
  if (typeof payload === "string" && payload.trim()) return payload.trim();
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const candidate = record.detail ?? record.message ?? record.error;
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    if (candidate !== undefined) return JSON.stringify(candidate);
  }
  return `Yêu cầu thất bại (HTTP ${status}).`;
}

/**
 * Gọi REST API và trả về JSON đã parse.
 * Ném `ApiError` với `status = 0` khi không kết nối được máy chủ.
 */
export async function fetchApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path), { ...init, headers });
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
    throw new ApiError(extractErrorMessage(payload, response.status), response.status);
  }

  return payload as T;
}
