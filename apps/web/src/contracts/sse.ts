/**
 * Hợp đồng luồng Server-Sent Events.
 * Nguồn: contracts/schemas/sse-event.json, docs/api/API.md §3.5, contracts/README.md §3.2.
 * Đây là nguồn duy nhất về tên sự kiện — lib/sse.ts và hooks/sse-machine.ts đều dùng lại.
 */

/** Hợp của route đang chạy (`/stream/earthquakes`) và đặc tả (`/events/stream`). */
export const SSE_EVENT_NAMES = [
  "earthquake_detected",
  "earthquake_alert",
  "heartbeat",
  "alert",
  "ingestion_cycle_completed",
  "database_cleared",
] as const;

export type SSEEventName = (typeof SSE_EVENT_NAMES)[number];

export interface SSEEventPayload<T = unknown> {
  event: SSEEventName;
  data: T;
  /** UTC ISO 8601 (hậu tố Z). */
  timestamp: string;
  /** Header `id:` — chống trùng khi reconnect. */
  id?: string;
  /** Header `retry:` (ms) — gợi ý backoff. */
  retry?: number;
}

export function isSseEventName(value: string): value is SSEEventName {
  return (SSE_EVENT_NAMES as readonly string[]).includes(value);
}
