import { useCallback, useEffect, useState } from "react";
import type { SSEEventPayload } from "../contracts";
import { createSseSource, isKnownSseEvent, type SseStatus } from "../lib/sse.ts";
import { getEventsStreamUrl } from "../services/sse-api.ts";

/** Giữ tương thích: consumer cũ có thể truyền route legacy tường minh (RULE-03). */
export { LEGACY_STREAM_ENDPOINT } from "../services/sse-api.ts";

export interface UseSSEResult {
  data: SSEEventPayload | null;
  status: SseStatus;
  isConnected: boolean;
  lastEventTime: Date | null;
  reconnectAttempt: number;
  /** Mở lại kết nối SSE để lấy sự kiện mới (dùng khi chu kỳ cập nhật 5 phút kết thúc). */
  reconnect: () => void;
}

/**
 * Kết nối SSE có tự phục hồi, dùng `createSseSource` từ `lib/sse.ts`
 * (docs/architecture.md §12: lib/ chứa API Client & SSE EventSource).
 *
 * - Chữ ký giữ nguyên `useSSE(endpoint?)` (RULE-03).
 * - State machine: `connecting → open → reconnecting → (open | disconnected)`.
 * - Backoff 1s→2s→4s…→30s + jitter, tối đa 8 lần.
 * - Lắng nghe hợp tên sự kiện của cả `/stream/earthquakes` và `/events/stream`.
 */
export function useSSE(endpoint?: string): UseSSEResult {
  const [data, setData] = useState<SSEEventPayload | null>(null);
  const [status, setStatus] = useState<SseStatus>("connecting");
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState<number>(0);
  const [reconnectKey, setReconnectKey] = useState<number>(0);

  const reconnect = useCallback(() => setReconnectKey((key) => key + 1), []);

  useEffect(() => {
    const targetUrl = getEventsStreamUrl(endpoint);
    const connection = createSseSource({
      url: targetUrl,
      onPayload: (payload) => {
        setData(payload);
        setLastEventTime(new Date());
      },
      onStatus: setStatus,
      onAttempt: setReconnectAttempt,
    });

    return () => connection.close();
  }, [endpoint, reconnectKey]);

  return {
    data,
    status,
    isConnected: status === "open",
    lastEventTime,
    reconnectAttempt,
    reconnect,
  };
}

export { isKnownSseEvent };
