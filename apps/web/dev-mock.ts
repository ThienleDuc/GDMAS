export interface ContractMockResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export type FixtureLoader = (filename: string) => unknown;

export function isContractMockEnabled(env: Record<string, string | undefined>): boolean {
  return env.VITE_API_MOCKING === "enabled";
}

export function resolveContractMock(
  method: string,
  pathname: string,
  loadFixture: FixtureLoader,
): ContractMockResponse | null {
  if (method.toUpperCase() !== "GET" || !pathname.startsWith("/api/v1/")) return null;

  const jsonHeaders = { "Content-Type": "application/json; charset=utf-8" };
  const jsonResponse = (value: unknown, status = 200): ContractMockResponse => ({
    status,
    headers: jsonHeaders,
    body: JSON.stringify(value),
  });

  if (pathname === "/api/v1/stream/earthquakes") {
    const event = loadFixture("sse-event_sample.json") as { event: string; data: unknown };
    return {
      status: 200,
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      body: `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`,
    };
  }

  const routes: Record<string, string> = {
    "/api/v1/patterns": "patterns_sample.json",
    "/api/v1/health": "health_sample.json",
    "/api/v1/system/status": "system_status_sample.json",
    "/api/v1/predictions": "predictions_sample.json",
    "/api/v1/classifications": "classifications_sample.json",
    "/api/v1/clusters": "clusters_sample.json",
  };
  const fixtureName = routes[pathname];
  if (fixtureName) return jsonResponse(loadFixture(fixtureName));

  if (pathname === "/api/v1/statistics/earthquakes") {
    return jsonResponse({
      success: true,
      data: {
        total_events: 1,
        strong_events_count: 0,
        moderate_events_count: 1,
        minor_events_count: 0,
        recent_24h_count: 0,
        avg_magnitude: 4.2,
        max_magnitude: 4.2,
        latest_event_time: "2026-11-06T15:30:00Z",
        time_series_preview: [],
      },
    });
  }

  if (pathname === "/api/v1/earthquakes") {
    const earthquake = loadFixture("earthquake_sample.json");
    return jsonResponse({
      success: true,
      data: [earthquake],
      metadata: { total: 1, page: 1, limit: 20, total_pages: 1 },
    });
  }

  if (/^\/api\/v1\/earthquakes\/\d+$/u.test(pathname)) {
    const earthquake = loadFixture("earthquake_sample.json") as { id: number };
    const requestedId = Number(pathname.slice(pathname.lastIndexOf("/") + 1));
    return requestedId === earthquake.id
      ? jsonResponse(earthquake)
      : jsonResponse({ success: false, error: { code: "RESOURCE_NOT_FOUND", message: "Earthquake not found" } }, 404);
  }

  return jsonResponse({
    success: false,
    error: { code: "RESOURCE_NOT_FOUND", message: `No local mock fixture for ${pathname}` },
  }, 404);
}
