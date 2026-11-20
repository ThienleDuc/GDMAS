/**
 * Tương thích ngược: máy trạng thái SSE đã chuyển sang `src/lib/sse.ts`
 * (docs/architecture.md §12: lib/ chứa API Client & SSE EventSource).
 * File này chỉ re-export để `useSSE` và test cũ không phải đổi import (RULE-03).
 */

export {
  SSE_BASE_DELAY_MS,
  SSE_EVENT_NAMES,
  SSE_MAX_DELAY_MS,
  SSE_MAX_RECONNECT_ATTEMPTS,
  createSseSource,
  isKnownSseEvent,
  nextBackoff,
  parseSsePayload,
  resolveSseUrl,
  shouldGiveUp,
  sseStatusLabel,
  type SseEventName,
  type SseStatus,
} from "../lib/sse.ts";
