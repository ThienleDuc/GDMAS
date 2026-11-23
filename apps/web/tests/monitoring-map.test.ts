/**
 * Unit test offline cho logic thuần trang bản đồ giám sát (T7.04).
 * Testcase: .agents/notes/testcase/2026-11-21-monitoring-leaflet-map-markers-thien.md
 * Chạy: cd apps/web && node --test tests/monitoring-map.test.ts
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  MAP_PAGE_SIZE,
  applySseEvent,
  buildEarthquakeQuery,
  centerLabel,
  deriveMapState,
  filterMapEvents,
  magnitudeLevelLabel,
  popupFields,
} from "../src/features/monitoring/monitoring-view.ts";
import { isApiEmptyEnvelope, isApiEnvelope } from "../src/contracts/common.ts";
import type { SSEEventPayload } from "../src/contracts/sse.ts";
import {
  depthToOpacity,
  filterEarthquakes,
  formatCoordinate,
  haversineKm,
  magnitudeToColor,
  magnitudeToRadius,
  markerStyleFor,
  timeRangeBounds,
  toMapEarthquake,
  viewportToBbox,
} from "../src/lib/transforms/map-data.ts";
import type { MapFilters, MapViewState } from "../src/lib/transforms/map-types.ts";

const NOW = new Date("2026-11-21T00:00:00Z");

/** contracts/examples/earthquake_sample.json */
const sample = {
  id: 1042,
  source: "USGS",
  source_event_id: "us7000m8v8",
  event_time: "2026-11-06T15:30:00Z",
  latitude: 37.7749,
  longitude: -122.4194,
  depth_km: 10.5,
  magnitude: 4.2,
  magnitude_type: "mw",
  place: "12 km NE of San Francisco, CA",
  source_url: "https://earthquake.usgs.gov/earthquakes/eventpage/us7000m8v8",
};

const filters: MapFilters = { minMagnitude: 2.5, timeRange: "7d", showClusters: true };
const bbox = { minLat: 35, maxLat: 40, minLon: -125, maxLon: -120 };

function ssePayload(event: SSEEventPayload["event"], data: unknown): SSEEventPayload {
  return { event, data, timestamp: NOW.toISOString() };
}

test("TC-01: buildEarthquakeQuery — UTC Z, WGS84, magnitude, sort", () => {
  const params = buildEarthquakeQuery(filters, bbox, { now: NOW });
  const expectedStart = new Date(NOW.getTime() - 7 * 24 * 3600 * 1000).toISOString();

  assert.equal(params.start_time, expectedStart);
  assert.equal(params.end_time, NOW.toISOString());
  assert.ok(params.start_time?.endsWith("Z"));
  assert.ok(params.end_time?.endsWith("Z"));
  assert.equal(params.min_magnitude, 2.5);
  // Bản đồ realtime: sắp theo thời gian, không còn theo độ lớn.
  assert.equal(params.sort_by, "event_time");
  assert.equal(params.order, "desc");
  assert.equal(params.page, 1);
  assert.equal(params.limit, MAP_PAGE_SIZE);
  assert.equal(params.min_lat, 35);
  assert.equal(params.max_lat, 40);
  assert.equal(params.min_lon, -125);
  assert.equal(params.max_lon, -120);
});

test("TC-02: Empty DB (Demo §4) — deriveMapState, SSE xóa rỗng, popup thiếu → '—'", () => {
  assert.equal(deriveMapState({ loading: false, error: null, events: [] }), "empty");
  assert.deepEqual(applySseEvent([], ssePayload("database_cleared", {})), []);

  const event = toMapEarthquake(sample);
  const missing = popupFields({
    ...event,
    place: "",
    sourceEventId: "",
    depthKm: Number.NaN,
    magnitude: Number.NaN,
    sourceUrl: undefined,
  });
  assert.equal(missing.place, "—");
  assert.equal(missing.sourceEventId, "—");
  assert.equal(missing.depthKm, "—");
  assert.equal(missing.magnitude, "—");
  assert.equal(missing.sourceUrl, null);
});

test("TC-03: Boundary UTC & WGS84 — sample, bbox kẹp biên, preset 24h", () => {
  assert.equal(formatCoordinate(37.7749, -122.4194), "37.7749° N, 122.4194° W");

  const range = timeRangeBounds("24h", NOW);
  assert.ok(range.start?.endsWith("Z"));
  assert.equal(range.end, NOW.toISOString());
  assert.equal(range.start, new Date(NOW.getTime() - 24 * 3600 * 1000).toISOString());

  assert.deepEqual(viewportToBbox({ north: 95, south: -95, east: 180, west: -180 }), {
    minLat: -90,
    maxLat: 90,
    minLon: -180,
    maxLon: 180,
  });
});

test("TC-04: Error/negative — error state, SSE payload hỏng bị bỏ qua", () => {
  assert.equal(
    deriveMapState({ loading: false, error: new Error("HTTP 500"), events: [] }),
    "error",
  );
  assert.equal(deriveMapState({ loading: true, error: new Error("x"), events: [] }), "loading");
  assert.equal(
    deriveMapState({ loading: false, error: null, events: [toMapEarthquake(sample)] }),
    "ready",
  );

  const broken = ssePayload("earthquake_detected", { latitude: "không-phải-số", longitude: 10 });
  assert.deepEqual(applySseEvent([], broken), []);
  assert.deepEqual(applySseEvent([], ssePayload("earthquake_detected", null)), []);
});

test("TC-05: SSE thêm marker và dedupe theo source_event_id", () => {
  const first = applySseEvent([], ssePayload("earthquake_detected", sample));
  assert.equal(first.length, 1);
  assert.equal(first[0].sourceEventId, "us7000m8v8");
  assert.equal(first[0].latitude, 37.7749);
  assert.equal(first[0].longitude, -122.4194);

  const duplicate = applySseEvent(first, ssePayload("earthquake_detected", { ...sample, magnitude: 5.9 }));
  assert.equal(duplicate.length, 1);
  assert.equal(duplicate[0].magnitude, 5.9);

  const afterClear = applySseEvent(duplicate, ssePayload("database_cleared", {}));
  assert.deepEqual(afterClear, []);
});

test("TC-06: Style marker lấy từ map-data.ts (không tự tính lại)", () => {
  const style = markerStyleFor(toMapEarthquake(sample));
  assert.equal(style.radius, magnitudeToRadius(4.2));
  assert.equal(style.fillColor, magnitudeToColor(4.2));
  assert.equal(style.fillOpacity, depthToOpacity(10.5));
  assert.equal(style.fillColor, "#facc15");
});

test("TC-07: Haversine & lọc theo magnitude/thời gian", () => {
  const a = { latitude: 37.7749, longitude: -122.4194 };
  const b = { latitude: 37.8, longitude: -122.4 };
  const km = haversineKm(a, b);
  assert.ok(Number.isFinite(km) && km > 3 && km < 5, `Khoảng cách bất thường: ${km}`);
  assert.ok(Number.isNaN(haversineKm({ latitude: Number.NaN, longitude: 0 }, b)));

  const event = toMapEarthquake(sample);
  assert.equal(filterEarthquakes([event], { minMagnitude: 5 }).length, 0);
  assert.equal(filterMapEvents([event], { ...filters, minMagnitude: 4 }).length, 1);
  assert.equal(
    filterMapEvents([event], {
      ...filters,
      startTime: "2026-11-01T00:00:00Z",
      endTime: "2026-11-05T00:00:00Z",
    }).length,
    0,
  );
});

test("TC-08: Popup đủ 6 trường theo sample", () => {
  const fields = popupFields(toMapEarthquake(sample));
  assert.equal(fields.place, sample.place);
  assert.equal(fields.sourceEventId, "us7000m8v8");
  assert.ok(fields.eventTimeUtc.includes("UTC"));
  assert.ok(fields.eventTimeLocal.includes("UTC+7"));
  assert.equal(fields.depthKm, "10.5");
  assert.equal(fields.magnitude, "4.2");
  assert.equal(fields.sourceUrl, sample.source_url);
});

test("TC-09: File thuần không import leaflet (test offline 100%)", () => {
  const files = [
    "../src/lib/transforms/map-data.ts",
    "../src/lib/transforms/map-types.ts",
    "../src/features/monitoring/monitoring-view.ts",
  ];
  for (const file of files) {
    const source = fs.readFileSync(path.resolve(import.meta.dirname, file), "utf8");
    assert.doesNotMatch(source, /from\s+["'](?:react-)?leaflet/, `${file} không được import leaflet`);
  }
});

test("TC-10: HUD dùng toạ độ tâm thực, không số tĩnh", () => {
  const view: MapViewState = { latitude: 37.7749, longitude: -122.4194, zoom: 8 };
  assert.equal(centerLabel(view), "37.7749° N, 122.4194° W");
  assert.equal(centerLabel({ latitude: Number.NaN, longitude: 0, zoom: 5 }), "—");
});

test("TC-15: chọn quốc gia → bỏ bbox, limit không vượt 100 (BE le=100)", () => {
  const params = buildEarthquakeQuery(filters, null, { now: NOW });
  assert.equal(params.min_lat, undefined);
  assert.equal(params.max_lat, undefined);
  assert.equal(params.min_lon, undefined);
  assert.equal(params.max_lon, undefined);
  assert.equal(params.limit, 100);
  assert.ok((params.limit ?? 0) <= 100);
  assert.ok(params.start_time?.endsWith("Z"));
});

test("TC-16: empty envelope 200/success:false là kết quả rỗng, không phải lỗi", () => {
  const empty = { success: false, data: null, message: "Không có dữ liệu" };
  assert.equal(isApiEmptyEnvelope(empty), true);
  assert.equal(isApiEnvelope(empty), false);
  assert.equal(
    isApiEmptyEnvelope({ success: false, error: { code: "DATABASE_ERROR", message: "lỗi" } }),
    false,
  );
  assert.equal(isApiEmptyEnvelope({ success: true, data: [] }), false);
});

test("TC-18: nhãn mức độ theo đúng ngưỡng magnitudeToColor", () => {
  assert.equal(magnitudeLevelLabel(3.9), "Yếu");
  assert.equal(magnitudeLevelLabel(4.0), "Trung bình");
  assert.equal(magnitudeLevelLabel(5.0), "Mạnh");
  assert.equal(magnitudeLevelLabel(6.1), "Rất mạnh");
  assert.equal(magnitudeLevelLabel(Number.NaN), "Không rõ");
});
