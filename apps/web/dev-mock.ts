export interface ContractMockResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

import type { EarthquakeItem } from "./src/contracts/earthquake.ts";
import { countryOf } from "./src/features/earthquakes/country-filter.ts";
import { buildCatalogStatistics } from "./src/features/earthquakes/earthquake-insights.ts";
import { filterByCountryAndRegion, regionOf } from "./src/features/earthquakes/region-filter.ts";
import { createEarthquakeList, slicePage } from "./tests/mocks/earthquakes-list.ts";

export type FixtureLoader = (filename: string) => unknown;

/** Đọc tham số số từ query; bỏ giá trị rỗng/không hợp lệ (I3 — không bịa số). */
function numericQueryParam(query: URLSearchParams, key: string): number | undefined {
  const raw = query.get(key);
  if (raw === null || raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Một nguồn lọc duy nhất cho mọi endpoint động của mock (/earthquakes, /countries, /regions, /statistics).
 * Cùng ngữ nghĩa với API thật (API.md §3.2) để bộ lọc header + filter bar có tác dụng trong demo.
 */
function filterMockEarthquakes(query: URLSearchParams): EarthquakeItem[] {
  let list = createEarthquakeList();
  const startTime = query.get("start_time");
  const endTime = query.get("end_time");
  if (startTime) list = list.filter((item) => Date.parse(item.event_time) >= Date.parse(startTime));
  if (endTime) list = list.filter((item) => Date.parse(item.event_time) <= Date.parse(endTime));

  const minMagnitude = numericQueryParam(query, "min_magnitude");
  const maxMagnitude = numericQueryParam(query, "max_magnitude");
  const minDepth = numericQueryParam(query, "min_depth");
  const maxDepth = numericQueryParam(query, "max_depth");
  if (minMagnitude !== undefined) list = list.filter((item) => item.magnitude >= minMagnitude);
  if (maxMagnitude !== undefined) list = list.filter((item) => item.magnitude <= maxMagnitude);
  if (minDepth !== undefined) list = list.filter((item) => item.depth_km >= minDepth);
  if (maxDepth !== undefined) list = list.filter((item) => item.depth_km <= maxDepth);
  return filterByCountryAndRegion(list, query.get("country") ?? "all", query.get("region") ?? "all");
}

function countBy(items: readonly EarthquakeItem[], labelOf: (item: EarthquakeItem) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const label = labelOf(item);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

/** 4 endpoint phân tích lấy từ bundle analysis_sample.json (theo contract). */
const ANALYSIS_ROUTES: Record<string, "temporal" | "trend" | "seasonality" | "correlation"> = {
  "/api/v1/analysis/temporal": "temporal",
  "/api/v1/analysis/trend": "trend",
  "/api/v1/analysis/seasonality": "seasonality",
  "/api/v1/analysis/correlation": "correlation",
};

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

  // Cả 2 route SSE dùng chung generator trên BE — phục vụ cả chuẩn lẫn legacy (RULE-03).
  if (pathname === "/api/v1/events/stream" || pathname === "/api/v1/stream/earthquakes") {
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
  const analysisKey = ANALYSIS_ROUTES[pathname];
  if (analysisKey) {
    const bundle = loadFixture("analysis_sample.json") as Record<string, unknown>;
    const response = bundle[analysisKey];
    if (response && typeof response === "object") return jsonResponse(response);
  }

  const fixtureName = routes[pathname];
  if (fixtureName) return jsonResponse(loadFixture(fixtureName));

  const query = new URLSearchParams(search);

  // Danh mục quốc gia/khu vực — header cần để bật được bộ lọc khu vực (lỗi "chỉ lọc quốc gia").
  // BE trả toàn bộ danh mục theo cửa sổ/quốc gia — không tự thu hẹp theo lựa chọn hiện tại.
  const catalogQuery = new URLSearchParams(query);
  catalogQuery.delete("region");
  if (pathname === "/api/v1/earthquakes/countries") {
    const rows = countBy(filterMockEarthquakes(catalogQuery), countryOf);
    return jsonResponse({ success: true, data: rows.map((row) => ({ country: row.label, count: row.count })) });
  }
  if (pathname === "/api/v1/earthquakes/regions") {
    const country = query.get("country") ?? "all";
    const rows = countBy(filterMockEarthquakes(catalogQuery), (item) => regionOf(item, countryOf(item)));
    return jsonResponse({ success: true, data: rows.map((row) => ({ region: row.label, count: row.count })) });
  }

  // KPI dùng chung công thức với FE — ăn cùng bộ lọc với histogram/bảng.
  if (pathname === "/api/v1/statistics/earthquakes") {
    const filtered = filterMockEarthquakes(query);
    return jsonResponse(buildCatalogStatistics(filtered, filtered.length, new Date()));
  }

  if (pathname === "/api/v1/earthquakes") {
    const rawPage = Number(query.get("page") ?? "1");
    const rawLimit = Number(query.get("limit") ?? "10");
    const page = Number.isFinite(rawPage) ? rawPage : 1;
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 10;
    const paged = slicePage(filterMockEarthquakes(query), page, limit);
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
