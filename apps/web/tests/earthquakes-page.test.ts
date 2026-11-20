import assert from "node:assert/strict";
import test from "node:test";
import type { EarthquakeItem, EarthquakeListResponse } from "../src/contracts/earthquake.ts";
import {
  buildEarthquakeQuery,
  DEFAULT_PAGE_SIZE,
  deriveViewState,
  fetchPage,
  formatEventRow,
  resolveWindow,
  type EarthquakeFilters,
} from "../src/features/earthquakes/earthquake-view.ts";

const NOW = new Date("2026-11-20T12:00:00Z");

function makeItem(overrides: Partial<EarthquakeItem> = {}): EarthquakeItem {
  return {
    id: 1,
    source: "USGS",
    source_event_id: "us_test_001",
    event_time: "2026-11-20T00:00:00Z",
    latitude: 16.0,
    longitude: 108.0,
    depth_km: 10.5,
    magnitude: 5.2,
    place: "Test region",
    ...overrides,
  };
}

function makeResponse(items: EarthquakeItem[]): EarthquakeListResponse {
  return {
    success: true,
    data: items,
    metadata: { total: items.length, page: 1, limit: DEFAULT_PAGE_SIZE, total_pages: items.length ? 1 : 0 },
  };
}

const baseFilters: EarthquakeFilters = { range: "day" };

test("TC-01: buildEarthquakeQuery ánh xạ đúng tham số API.md §3.2", () => {
  const params = buildEarthquakeQuery(
    {
      range: "week",
      minMagnitude: 4.5,
      maxMagnitude: 7,
      minDepth: 10,
      maxDepth: 100,
      sortBy: "magnitude",
      order: "asc",
    },
    3,
    50,
    NOW,
  );
  assert.equal(params.page, 3);
  assert.equal(params.limit, 50);
  assert.equal(params.min_magnitude, 4.5);
  assert.equal(params.max_magnitude, 7);
  assert.equal(params.min_depth, 10);
  assert.equal(params.max_depth, 100);
  assert.equal(params.sort_by, "magnitude");
  assert.equal(params.order, "asc");
  assert.match(params.start_time ?? "", /Z$/u);
  assert.match(params.end_time ?? "", /Z$/u);
});

test("TC-02: khoảng day/week/month luôn UTC Z và start <= end", () => {
  for (const range of ["day", "week", "month"] as const) {
    const window = resolveWindow(range, NOW);
    assert.match(window.start_time, /Z$/u);
    assert.match(window.end_time, /Z$/u);
    assert.ok(Date.parse(window.start_time) <= Date.parse(window.end_time));
  }
  const day = resolveWindow("day", NOW);
  assert.equal(Date.parse(day.end_time) - Date.parse(day.start_time), 24 * 60 * 60 * 1000);
  const week = resolveWindow("week", NOW);
  assert.equal(Date.parse(week.end_time) - Date.parse(week.start_time), 7 * 24 * 60 * 60 * 1000);
});

test("TC-03–TC-06: deriveViewState ưu tiên loading → error → empty → ready", () => {
  const item = makeItem();
  assert.equal(deriveViewState({ loading: true, error: null, data: [] }), "loading");
  assert.equal(deriveViewState({ loading: false, error: new Error("boom"), data: [item] }), "error");
  assert.equal(deriveViewState({ loading: false, error: null, data: [] }), "empty");
  assert.equal(deriveViewState({ loading: false, error: null, data: [item] }), "ready");
});

test("TC-07: fetchPage dùng fetcher inject và xử lý success/empty/error", async () => {
  const params = buildEarthquakeQuery(baseFilters, 1, DEFAULT_PAGE_SIZE, NOW);
  const success = await fetchPage(params, async () => makeResponse([makeItem()]));
  assert.equal(success.total, 1);
  assert.equal(success.page, 1);
  assert.equal(success.data.length, 1);

  const empty = await fetchPage(params, async () => makeResponse([]));
  assert.equal(empty.total, 0);
  assert.deepEqual(empty.data, []);

  await assert.rejects(
    () => fetchPage(params, async () => { throw new Error("offline failure"); }),
    /offline failure/u,
  );
});

test("TC-08: formatEventRow giữ UTC text và trả '—' cho tọa độ sai", () => {
  const row = formatEventRow(makeItem());
  assert.match(row.time, /UTC$/u);
  assert.ok(row.time.includes("20/11/2026"), "Phải chứa ngày theo định dạng vi-VN");
  assert.equal(row.coordinates, "16.0000° N, 108.0000° E");
  assert.equal(row.source, "us_test_001");

  const bad = formatEventRow(makeItem({ latitude: 100, longitude: 200, place: "" }));
  assert.equal(bad.coordinates, "—");
  assert.equal(bad.place, "—");
});

test("TC-09: đổi filter rebuild query với page = 1", () => {
  const firstPage = buildEarthquakeQuery(baseFilters, 5, DEFAULT_PAGE_SIZE, NOW);
  assert.equal(firstPage.page, 5);
  const afterFilterChange = buildEarthquakeQuery({ ...baseFilters, minMagnitude: 5 }, 1, DEFAULT_PAGE_SIZE, NOW);
  assert.equal(afterFilterChange.page, 1);
  assert.equal(afterFilterChange.min_magnitude, 5);
});
