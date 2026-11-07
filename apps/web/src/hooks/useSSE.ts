import { useEffect, useState, useRef } from "react";
import { SSEEventPayload } from "../contracts";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export function useSSE(endpoint: string = "/api/v1/stream/earthquakes") {
  const [data, setData] = useState<SSEEventPayload | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Chuẩn hóa URL kết nối tới máy chủ Backend API
    const targetUrl = endpoint.startsWith("http")
      ? endpoint
      : `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

    const eventSource = new EventSource(targetUrl);
    eventSourceRef.current = eventSource;

    const handlePayload = (rawString: string) => {
      try {
        const parsed = JSON.parse(rawString);
        setData(parsed);
        setLastEventTime(new Date());
      } catch (err) {
        console.error("Lỗi khi parse SSE event data:", err);
      }
    };

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    // 1. Lắng nghe event mặc định "message"
    eventSource.onmessage = (event) => {
      handlePayload(event.data);
    };

    // 2. Lắng nghe event "heartbeat"
    eventSource.addEventListener("heartbeat", (event: MessageEvent) => {
      setIsConnected(true);
      handlePayload(event.data);
    });

    // 3. Lắng nghe event "earthquake_detected"
    eventSource.addEventListener("earthquake_detected", (event: MessageEvent) => {
      setIsConnected(true);
      handlePayload(event.data);
    });

    // 4. Lắng nghe event "alert"
    eventSource.addEventListener("alert", (event: MessageEvent) => {
      setIsConnected(true);
      handlePayload(event.data);
    });

    // 5. Lắng nghe event "ingestion_cycle_completed" (chu kỳ cào USGS 5 phút)
    eventSource.addEventListener("ingestion_cycle_completed", (event: MessageEvent) => {
      setIsConnected(true);
      handlePayload(event.data);
    });

    // 6. Lắng nghe event "database_cleared" (khi CSDL bị xóa trong kịch bản Demo Bước 2)
    eventSource.addEventListener("database_cleared", (event: MessageEvent) => {
      setIsConnected(true);
      handlePayload(event.data);
    });

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [endpoint]);

  return { data, isConnected, lastEventTime };
}
