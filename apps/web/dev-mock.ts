export interface ContractMockResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

import { createEarthquakeList, slicePage } from "./tests/mocks/earthquakes-list.ts";

export type FixtureLoader = (filename: string) => unknown;

export function isContractMockEnabled(env: Record<string, string | undefined>): boolean {
  return env.VITE_API_MOCKING === "enabled";
}

export function resolveContractMock(
  method: string,
  pathname: string,
  loadFixture: FixtureLoader,
  search = "",
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
    const all = createEarthquakeList();
    const avg = all.reduce((sum, item) => sum + item.magnitude, 0) / all.length;
    return jsonResponse({
      success: true,
      data: {
        total_events: all.length,
        strong_events_count: all.filter((item) => item.magnitude >= 6).length,
        moderate_events_count: all.filter((item) => item.magnitude >= 5 && item.magnitude < 6).length,
        minor_events_count: all.filter((item) => item.magnitude < 3).length,
        recent_24h_count: all.slice(0, 24).length,
        avg_magnitude: Number(avg.toFixed(2)),
        max_magnitude: Math.max(...all.map((item) => item.magnitude)),
        latest_event_time: all[0].event_time,
        time_series_preview: [],
      },
    });
  }

  if (pathname === "/api/v1/earthquakes") {
    const query = new URLSearchParams(search);
    const rawPage = Number(query.get("page") ?? "1");
    const rawLimit = Number(query.get("limit") ?? "10");
    const page = Number.isFinite(rawPage) ? rawPage : 1;
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 10;
    const startTime = query.get("start_time");
    const endTime = query.get("end_time");
    let list = createEarthquakeList();
    if (startTime) list = list.filter((item) => Date.parse(item.event_time) >= Date.parse(startTime));
    if (endTime) list = list.filter((item) => Date.parse(item.event_time) <= Date.parse(endTime));
    const paged = slicePage(list, page, limit);
    return jsonResponse({ success: true, data: paged.data, metadata: paged });
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
