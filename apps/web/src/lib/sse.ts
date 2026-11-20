/**
 * Lớp SSE của Terminal 7 — API Client / SSE EventSource theo docs/architecture.md §12.
 * Nguồn tên sự kiện: contracts/sse.ts (docs/api/API.md §3.5, contracts/README.md §3.2).
 * Các helper thuần ở đây để kiểm thử offline; `createSseSource` chỉ tạo EventSource khi được gọi.
 */

import {
  isSseEventName,
  SSE_EVENT_NAMES,
  type SSEEventName,
  type SSEEventPayload,
} from "../contracts/sse.ts";

export { SSE_EVENT_NAMES } from "../contracts/sse.ts";

export type SseStatus = "connecting" | "open" | "reconnecting" | "disconnected";

/** Alias giữ tương thích với `hooks/sse-machine.ts` cũ (RULE-03). */
export type SseEventName = SSEEventName;

export const SSE_MAX_RECONNECT_ATTEMPTS = 8;
export const SSE_BASE_DELAY_MS = 1_000;
export const SSE_MAX_DELAY_MS = 30_000;

export function isKnownSseEvent(name: string): name is SseEventName {
  return isSseEventName(name);
}

/**
 * Thời gian chờ trước lần thử lại thứ `attempt` (0-based):
 * 1s → 2s → 4s … chặn trần 30s, kèm jitter ±20%. `random` cho phép test tất định.
 */
export function nextBackoff(
  attempt: number,
  options: { baseMs?: number; maxMs?: number; random?: () => number } = {},
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

/** Đã vượ số lần thử lại cho phép → ngừng retry, chuyển `disconnected`. */
export function shouldGiveUp(
  attempt: number,
  maxAttempts: number = SSE_MAX_RECONNECT_ATTEMPTS,
): boolean {
  return attempt > maxAttempts;
}

/** Chuẩn hoá URL SSE: tuyệt đối giữ nguyên, rỗng → fallback, tương đối → ghép API base. */
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

/**
 * Parse một payload từ `event.data`. Payload hỏng trả `null` để không làm sập luồng.
 * Tên event lạ vẫn được giữ (enum SSE mở rộng additive) nhưng vẫn là string.
 */
export function parseSsePayload(raw: string): SSEEventPayload | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const record = parsed as Record<string, unknown>;
    if (typeof record.event !== "string") return null;
    if (!("data" in record)) return null;

    return {
      event: record.event as SSEEventName,
      data: record.data,
      timestamp: typeof record.timestamp === "string" ? record.timestamp : new Date().toISOString(),
      ...(typeof record.id === "string" ? { id: record.id } : {}),
      ...(typeof record.retry === "number" ? { retry: record.retry } : {}),
    };
  } catch {
    return null;
  }
}

export interface CreateSseSourceOptions {
  url: string;
  onPayload: (payload: SSEEventPayload) => void;
  onStatus?: (status: SseStatus) => void;
  onAttempt?: (attempt: number) => void;
  random?: () => number;
}

/**
 * Tạo kết nối SSE có tự phục hồi (backoff 1s→2s→…→30s, tối đa 8 lần).
 * Trả về `{ close }` để caller huỷ sạch timer + EventSource.
 */
export function createSseSource(options: CreateSseSourceOptions): { close: () => void } {
  let disposed = false;
  let source: EventSource | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;

  const handle = (raw: string) => {
    if (disposed) return;
    const payload = parseSsePayload(raw);
    if (payload) options.onPayload(payload);
  };

  const connect = () => {
    if (disposed) return;
    options.onStatus?.(attempt === 0 ? "connecting" : "reconnecting");

    const eventSource = new EventSource(options.url);
    source = eventSource;

    eventSource.onopen = () => {
      if (disposed) return;
      attempt = 0;
      options.onAttempt?.(0);
      options.onStatus?.("open");
    };

    eventSource.onerror = () => {
      if (disposed) return;
      eventSource.close();
      if (source === eventSource) source = null;
      attempt += 1;
      options.onAttempt?.(attempt);

      if (shouldGiveUp(attempt)) {
        options.onStatus?.("disconnected");
        return;
      }
      options.onStatus?.("reconnecting");
      timer = setTimeout(connect, nextBackoff(attempt - 1, { random: options.random }));
    };

    eventSource.onmessage = (event) => handle(event.data);
    for (const name of SSE_EVENT_NAMES) {
      eventSource.addEventListener(name, (event) => handle((event as MessageEvent<string>).data));
    }
  };

  connect();

  return {
    close() {
      disposed = true;
      if (timer) clearTimeout(timer);
      source?.close();
    },
  };
}
