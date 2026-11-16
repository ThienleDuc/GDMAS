/**
 * Máy trạng thái thuần cho kết nối Server-Sent Events (Terminal 7 — Frontend).
 *
 * Tách khỏi `useSSE` để kiểm thử offline (không cần DOM/EventSource thật):
 * backoff, giới hạn số lần thử lại và bộ tên sự kiện hợp của hai route
 * (`/api/v1/stream/earthquakes` và `/api/v1/events/stream`).
 */

export type SseStatus = "connecting" | "open" | "reconnecting" | "disconnected";

/** Hợp tên sự kiện: route đang chạy + đặc tả `docs/api/API.md` §3.5. */
export const SSE_EVENT_NAMES = [
  "earthquake_detected",
  "earthquake_alert",
  "heartbeat",
  "alert",
  "ingestion_cycle_completed",
  "database_cleared",
] as const;

export type SseEventName = (typeof SSE_EVENT_NAMES)[number];

/** Số lần thử lại tối đa trước khi chuyển hẳn sang `disconnected`. */
export const SSE_MAX_RECONNECT_ATTEMPTS = 8;

export const SSE_BASE_DELAY_MS = 1_000;
export const SSE_MAX_DELAY_MS = 30_000;

export function isKnownSseEvent(name: string): name is SseEventName {
  return (SSE_EVENT_NAMES as readonly string[]).includes(name);
}

/**
 * Thời gian chờ trước lần thử lại thứ `attempt` (0-based):
 * 1s → 2s → 4s … chặn trần 30s, kèm jitter ±20% để tránh dồn sóng.
 * `random` cho phép test tất định (mặc định `Math.random`).
 */
export function nextBackoff(
  attempt: number,
  options: {
    baseMs?: number;
    maxMs?: number;
    random?: () => number;
  } = {},
): number {
  const baseMs = options.baseMs ?? SSE_BASE_DELAY_MS;
  const maxMs = options.maxMs ?? SSE_MAX_DELAY_MS;
  const random = options.random ?? Math.random;
  const safeAttempt = Math.max(0, Math.floor(attempt));
  const raw = baseMs * Math.pow(2, safeAttempt);
  const clamped = Math.min(raw, maxMs);
  const jitterRatio = (random() * 2 - 1) * 0.2;
  return Math.max(0, Math.round(clamped * (1 + jitterRatio)));
}

/** Đã vượt số lần thử lại cho phép → ngừng retry, trạng thái `disconnected`. */
export function shouldGiveUp(attempt: number, maxAttempts: number = SSE_MAX_RECONNECT_ATTEMPTS): boolean {
  return attempt > maxAttempts;
}

/**
 * Chuẩn hoá URL SSE:
 * - `endpoint` tuyệt đối (`http…`) giữ nguyên.
 * - `endpoint` rỗng → dùng biến môi trường `VITE_SSE_ENDPOINT`, rồi tới route đang chạy.
 * - còn lại ghép với `API_BASE_URL`.
 */
export function resolveSseUrl(
  endpoint: string | undefined,
  apiBaseUrl: string,
  fallbackEndpoint = "/api/v1/stream/earthquakes",
): string {
  const raw = endpoint?.trim() || fallbackEndpoint;
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = apiBaseUrl.replace(/\/+$/, "");
  return `${base}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

/** Nhãn tiếng Việt cho badge trạng thái kết nối trên shell. */
export function sseStatusLabel(status: SseStatus): string {
  switch (status) {
    case "open":
      return "SSE LIVE";
    case "connecting":
      return "SSE Đang kết nối…";
    case "reconnecting":
      return "SSE Đang kết nối lại…";
    case "disconnected":
      return "SSE Mất kết nối";
  }
}
