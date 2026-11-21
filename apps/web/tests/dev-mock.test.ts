import assert from "node:assert/strict";
import test from "node:test";
import { isContractMockEnabled, resolveContractMock } from "../dev-mock.ts";

function fixture(filename: string): unknown {
  const fixtures: Record<string, unknown> = {
    "earthquake_sample.json": {
      id: 1042,
      source_event_id: "us7000m8v8",
      event_time: "2026-11-06T15:30:00Z",
      latitude: 37.7749,
      longitude: -122.4194,
      depth_km: 10.5,
      magnitude: 4.2,
    },
    "patterns_sample.json": { success: true, total_patterns: 6, patterns: [] },
    "health_sample.json": { success: true, data: { status: "healthy" } },
    "system_status_sample.json": { success: true, data: { services: {} } },
    "predictions_sample.json": { success: true, data: {} },
    "classifications_sample.json": { success: true, data: {} },
    "clusters_sample.json": { success: true, data: {} },
    "analysis_sample.json": {
      temporal: {
        success: true,
        data: { interval: "day", line_chart: [], scatter_plot: [], histogram: { magnitude_bins: [] } },
      },
      trend: { success: true, data: { resample_freq: "M", metric: "count", series: [] } },
      seasonality: { success: true, data: { components: { seasonal_line: [] } } },
      correlation: { success: true, data: { variables: [], matrix: [], method: "pearson" } },
    },
    "sse-event_sample.json": {
      event: "earthquake_detected",
      timestamp: "2026-11-06T15:35:00Z",
      data: { source_event_id: "us7000m8v8" },
    },
  };
  assert.ok(filename in fixtures, `unexpected fixture: ${filename}`);
  return fixtures[filename];
}

test("TC-08: mock flag is explicit opt-in", () => {
  assert.equal(isContractMockEnabled({ VITE_API_MOCKING: "enabled" }), true);
  assert.equal(isContractMockEnabled({ VITE_API_MOCKING: "disabled" }), false);
  assert.equal(isContractMockEnabled({ PUBLIC_API_MOCKING: "enabled" }), false);
  assert.equal(isContractMockEnabled({}), false);
});

test("TC-09: contract API routes serve fixture envelopes offline", () => {
  const cases = [
    ["/api/v1/patterns", "patterns_sample.json"],
    ["/api/v1/health", "health_sample.json"],
    ["/api/v1/system/status", "system_status_sample.json"],
    ["/api/v1/predictions", "predictions_sample.json"],
    ["/api/v1/classifications", "classifications_sample.json"],
    ["/api/v1/clusters", "clusters_sample.json"],
  ] as const;
  for (const [path, filename] of cases) {
    const response = resolveContractMock("GET", path, fixture);
    assert.ok(response);
    assert.equal(response.status, 200);
    assert.deepEqual(JSON.parse(response.body), fixture(filename));
  }
});

test("TC-11: analysis endpoints serve contract bundle subsections offline", () => {
  const cases = [
    ["/api/v1/analysis/temporal", "temporal"],
    ["/api/v1/analysis/trend", "trend"],
    ["/api/v1/analysis/seasonality", "seasonality"],
    ["/api/v1/analysis/correlation", "correlation"],
  ] as const;

  const bundle = fixture("analysis_sample.json") as Record<string, unknown>;
  for (const [path, key] of cases) {
    const response = resolveContractMock("GET", path, fixture);
    assert.ok(response, `${path} phải được mock phục vụ`);
    assert.equal(response.status, 200);
    assert.deepEqual(JSON.parse(response.body), bundle[key]);
  }
});

test("TC-10: earthquake list/detail and SSE are served from contract fixtures", () => {
  const list = resolveContractMock("GET", "/api/v1/earthquakes", fixture);
  assert.ok(list);
  const listBody = JSON.parse(list.body) as {
    success: boolean;
    data: Array<{ id: number }>;
    metadata: { total: number; page: number; limit: number; total_pages: number };
  };
  assert.equal(listBody.success, true);
  assert.equal(listBody.data.length, 10);
  assert.equal(listBody.metadata.total, 40);
  assert.equal(listBody.metadata.total_pages, 4);

  const secondPage = resolveContractMock("GET", "/api/v1/earthquakes", fixture, "?page=2");
  assert.ok(secondPage);
  const secondBody = JSON.parse(secondPage.body) as { metadata: { page: number } };
  assert.equal(secondBody.metadata.page, 2);

  const allForChart = resolveContractMock("GET", "/api/v1/earthquakes", fixture, "?page=1&limit=100");
  assert.ok(allForChart);
  const allBody = JSON.parse(allForChart.body) as { data: unknown[] };
  assert.equal(allBody.data.length, 40);

  const futureWindow = resolveContractMock("GET", "/api/v1/earthquakes", fixture, "?start_time=2099-01-01T00:00:00Z");
  assert.ok(futureWindow);
  const futureBody = JSON.parse(futureWindow.body) as { data: unknown[]; metadata: { total: number } };
  assert.equal(futureBody.data.length, 0);
  assert.equal(futureBody.metadata.total, 0);

  const detail = resolveContractMock("GET", "/api/v1/earthquakes/1042", fixture);
  assert.ok(detail);
  assert.equal((JSON.parse(detail.body) as { id: number }).id, 1042);

  const sse = resolveContractMock("GET", "/api/v1/stream/earthquakes", fixture);
  assert.ok(sse);
  assert.match(sse.headers["Content-Type"], /text\/event-stream/u);
  assert.match(sse.body, /event: earthquake_detected\ndata:/u);
});

test("TC-11: unsupported API path gets contract-shaped 404; non-API and non-GET pass through", () => {
  const missing = resolveContractMock("GET", "/api/v1/unknown", fixture);
  assert.ok(missing);
  assert.equal(missing.status, 404);
  assert.equal((JSON.parse(missing.body) as { success: boolean }).success, false);
  assert.equal(resolveContractMock("GET", "/dashboard", fixture), null);
  assert.equal(resolveContractMock("POST", "/api/v1/earthquakes/sync", fixture), null);
});
