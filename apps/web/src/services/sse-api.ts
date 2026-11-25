/**
 * Service adapter cho SSE endpoint T6. Nguồn path chuẩn: docs/api/API.md §3.5.
 * Hạ tầng kết nối/backoff nằm ở `lib/sse.ts`; event names ở `contracts/sse.ts`.
 */

import type { SSEEventPayload } from "../contracts/sse.ts";
import { createSseSource, resolveSseUrl, type SseStatus } from "../lib/sse.ts";

const apiEnvironment = import.meta.env ?? {};
const API_BASE_URL = apiEnvironment.VITE_API_BASE_URL || "http://localhost:8000";
const DEFAULT_EVENTS_ENDPOINT = "/api/v1/events/stream";
const LEGACY_STREAM_ENDPOINT = "/api/v1/stream/earthquakes";

export interface EventsStreamOptions {
  endpoint?: string;
  onPayload: (payload: SSEEventPayload) => void;
  onStatus?: (status: SseStatus) => void;
  onAttempt?: (attempt: number) => void;
}

/** Resolve URL chuẩn `/events/stream`, vẫn nhận override route cũ cho consumer hiện tại. */
export function getEventsStreamUrl(endpoint?: string): string {
  const configuredEndpoint = endpoint ?? apiEnvironment.VITE_SSE_ENDPOINT ?? DEFAULT_EVENTS_ENDPOINT;
  return resolveSseUrl(configuredEndpoint, API_BASE_URL, DEFAULT_EVENTS_ENDPOINT);
}

/** Tạo SSE connection theo service layer; caller chịu trách nhiệm gọi `close()`. */
export function connectEventsStream(options: EventsStreamOptions): { close: () => void } {
  return createSseSource({
    url: getEventsStreamUrl(options.endpoint),
    onPayload: options.onPayload,
    onStatus: options.onStatus,
    onAttempt: options.onAttempt,
  });
}

export { DEFAULT_EVENTS_ENDPOINT, LEGACY_STREAM_ENDPOINT };
