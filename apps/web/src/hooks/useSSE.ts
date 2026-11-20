import { useEffect, useState } from "react";
import type { SSEEventPayload } from "../contracts";
import {
  createSseSource,
  isKnownSseEvent,
  resolveSseUrl,
  type SseStatus,
} from "../lib/sse.ts";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const ENV_ENDPOINT = import.meta.env.VITE_SSE_ENDPOINT as string | undefined;
const DEFAULT_ENDPOINT = "/api/v1/stream/earthquakes";

export interface UseSSEResult {
  data: SSEEventPayload | null;
  status: SseStatus;
  isConnected: boolean;
  lastEventTime: Date | null;
  reconnectAttempt: number;
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
export function useSSE(endpoint: string = ENV_ENDPOINT || DEFAULT_ENDPOINT): UseSSEResult {
  const [data, setData] = useState<SSEEventPayload | null>(null);
  const [status, setStatus] = useState<SseStatus>("connecting");
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState<number>(0);

  useEffect(() => {
    const targetUrl = resolveSseUrl(endpoint, API_BASE_URL, DEFAULT_ENDPOINT);
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
  }, [endpoint]);

  return {
    data,
    status,
    isConnected: status === "open",
    lastEventTime,
    reconnectAttempt,
  };
}

export { isKnownSseEvent };
