import { useEffect, useState } from "react";
import { SSEEventPayload } from "../contracts";

export function useSSE(endpoint: string = "/api/v1/stream/earthquakes") {
  const [data, setData] = useState<SSEEventPayload | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    const eventSource = new EventSource(endpoint);

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setData(parsed);
      } catch (err) {
        console.error("Failed to parse SSE event data:", err);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [endpoint]);

  return { data, isConnected };
}

