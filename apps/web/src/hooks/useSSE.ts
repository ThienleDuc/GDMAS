import { useEffect, useState } from "react";
import type { SSEEventPayload } from "../contracts";
import {
  isKnownSseEvent,
  nextBackoff,
  resolveSseUrl,
  shouldGiveUp,
  SSE_EVENT_NAMES,
  SSE_MAX_RECONNECT_ATTEMPTS,
  type SseStatus,
} from "./sse-machine";

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
 * Kết nối SSE có tự phục hồi.
 *
 * - Chữ ký giữ nguyên `useSSE(endpoint?)` (RULE-03) nên 4 trang đang dùng không phải sửa.
 * - State machine: `connecting → open → reconnecting → (open | disconnected)`.
 * - Backoff 1s→2s→4s…→30s + jitter, tối đa `SSE_MAX_RECONNECT_ATTEMPTS` lần.
 * - Lắng nghe hợp tên sự kiện của cả `/stream/earthquakes` và `/events/stream`.
 */
export function useSSE(endpoint: string = ENV_ENDPOINT || DEFAULT_ENDPOINT): UseSSEResult {
  const [data, setData] = useState<SSEEventPayload | null>(null);
  const [status, setStatus] = useState<SseStatus>("connecting");
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState<number>(0);

  useEffect(() => {
    let disposed = false;
    let source: EventSource | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

    const targetUrl = resolveSseUrl(endpoint, API_BASE_URL, DEFAULT_ENDPOINT);

    const handlePayload = (rawString: string) => {
      if (disposed || !rawString) return;
      try {
        const parsed = JSON.parse(rawString) as SSEEventPayload;
        if (parsed && typeof parsed.event === "string") {
          setData(parsed);
          setLastEventTime(new Date());
        }
      } catch (err) {
        // Payload hỏng không được làm sập luồng SSE — chỉ ghi log để debug.
        console.warn("[useSSE] Bỏ qua payload không phải JSON hợp lệ:", err);
      }
    };

    const connect = () => {
      if (disposed) return;
      setStatus(attempt === 0 ? "connecting" : "reconnecting");

      const eventSource = new EventSource(targetUrl);
      source = eventSource;

      eventSource.onopen = () => {
        if (disposed) return;
        attempt = 0;
        setReconnectAttempt(0);
        setStatus("open");
      };

      eventSource.onerror = () => {
        if (disposed) return;
        eventSource.close();
        if (source === eventSource) source = null;
        attempt += 1;
        setReconnectAttempt(attempt);

        if (shouldGiveUp(attempt, SSE_MAX_RECONNECT_ATTEMPTS)) {
          setStatus("disconnected");
          return;
        }

        setStatus("reconnecting");
        timer = setTimeout(connect, nextBackoff(attempt - 1));
      };

      eventSource.onmessage = (event) => handlePayload(event.data);

      // Các backend hiện tại phát sự kiện có `event:` name → phải addEventListener riêng.
      for (const name of SSE_EVENT_NAMES) {
        eventSource.addEventListener(name, (event) => {
          const message = event as MessageEvent<string>;
          handlePayload(message.data);
        });
      }
    };

    connect();

    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      source?.close();
    };
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
