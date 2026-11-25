/**
 * Unit test offline cho tổng hợp khu vực giám sát từ USGS & cấu hình tile bản đồ (T7).
 * Testcase: .agents/notes/testcase/2026-11-23-monitoring-region-map-thien.md
 * Chạy: cd apps/web && node --test tests/monitoring-region-map.test.ts
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildMonitoringRegionRows,
  mergeRegionRows,
  regionKey,
} from "../src/features/monitoring/region-catalog-view.ts";
import { DEFAULT_TILE_URL, resolveTileUrl } from "../src/components/map/tile-url.ts";
import { toMapEarthquake } from "../src/lib/transforms/map-data.ts";
import {
  latestEventInRegion,
  sseRefreshKey,
  sortEventsByTimeDesc,
} from "../src/features/monitoring/monitoring-view.ts";
import type { SSEEventPayload } from "../src/contracts/sse.ts";
import type { MapEarthquake } from "../src/lib/transforms/map-types.ts";
import type { RegionClusterRow } from "../src/features/monitoring/region-clusters.ts";

type EventInput = Partial<MapEarthquake>;

function event(input: EventInput = {}): MapEarthquake {
  return {
    id: 1,
    sourceEventId: "us_test_001",
    place: "12 km NE of San Francisco, CA",
    eventTime: "2026-11-23T00:00:00Z",
    latitude: 37.7749,
    longitude: -122.4194,
    depthKm: 10.5,
    magnitude: 5.2,
    ...input,
  };
}

test("TC-dedupe: regionKey gộp biến thể, mỗi khu vực chỉ 1 dòng", () => {
  assert.equal(regionKey(" Honshu "), regionKey("honshu"));
  assert.equal(regionKey("HONSHU"), regionKey("honshu"));

  const rows = buildMonitoringRegionRows([
    event({ country: "Japan", region: "Honshu", magnitude: 4 }),
    event({ country: "Japan", region: " honshu ", magnitude: 6 }),
    event({ country: "Japan", region: "HONSHU", magnitude: 5 }),
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].region, "Honshu");
  assert.equal(rows[0].eventCount, 3);
  assert.equal(rows[0].maxMagnitude, 6);
});

test("TC-latest: lọc region chỉ giữ đúng 1 trận mới nhất", () => {
  const events = [
    event({ sourceEventId: "a", country: "Japan", region: "Honshu", eventTime: "2026-11-23T01:00:00Z" }),
    event({ sourceEventId: "b", country: "Japan", region: "Honshu", eventTime: "2026-11-23T03:00:00Z" }),
    event({ sourceEventId: "c", country: "Japan", region: "Honshu", eventTime: "bad" }),
    event({ sourceEventId: "d", country: "Japan", region: "Osaka", eventTime: "2026-11-23T05:00:00Z" }),
  ];
  const latest = latestEventInRegion(events, "Japan", "Honshu");
  assert.equal(latest.length, 1);
  assert.equal(latest[0].sourceEventId, "b");

  const all = latestEventInRegion(events, "Japan", "all");
  assert.equal(all.length, 4);
  assert.equal(all[0].sourceEventId, "d");
});

test("TC-latest: tie theo source_event_id, timestamp hỏng xếp cuối", () => {
  const events = [
    event({ sourceEventId: "z", country: "Japan", region: "Honshu", eventTime: "2026-11-23T03:00:00Z" }),
    event({ sourceEventId: "a", country: "Japan", region: "Honshu", eventTime: "2026-11-23T03:00:00Z" }),
    event({ sourceEventId: "bad", country: "Japan", region: "Honshu", eventTime: "not-a-date" }),
  ];
  assert.deepEqual(
    latestEventInRegion(events, "Japan", "Honshu").map((item) => item.sourceEventId),
    ["a"],
  );
});

test("TC-panel: MapRegionPanel dedupe danh sách khu vực", () => {
  const source = readFileSync(
    resolve(import.meta.dirname, "../src/components/map/MapRegionPanel.tsx"),
    "utf8",
  );
  assert.match(source, /regionKey\(name\)/u);
  assert.match(source, /seenExtraRegions/u);
  assert.match(source, /seenClusterRegions/u);
});

test("TC-01: gom theo quốc gia & khu vực từ field BE, số đếm và magnitude thật", () => {
  const rows = buildMonitoringRegionRows([
    event({ sourceEventId: "us_001", country: "USA", region: "California", magnitude: 5.2 }),
    event({ sourceEventId: "us_002", country: "Japan", region: "Honshu", magnitude: 4.4 }),
    event({ sourceEventId: "us_003", country: "USA", region: "California", magnitude: 4.8 }),
  ]);

  assert.equal(rows.length, 2);
  const california = rows.find((row) => row.country === "USA" && row.region === "California");
  assert.ok(california);
  assert.equal(california.eventCount, 2);
  assert.equal(california.avgMagnitude, 5);
  assert.equal(california.maxMagnitude, 5.2);
  const honshu = rows.find((row) => row.country === "Japan" && row.region === "Honshu");
  assert.ok(honshu);
  assert.equal(honshu.eventCount, 1);
  assert.equal(honshu.avgMagnitude, 4.4);
  // Sort theo số sự kiện giảm dần.
  assert.equal(rows[0].country, "USA");
});

test("TC-02: thiếu field BE → fallback suy từ place, không rớt sự kiện", () => {
  const rows = buildMonitoringRegionRows([
    event({ country: null, region: null, place: "30 km E of Honshu", magnitude: 4.4 }),
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].country, "Japan");
  assert.equal(rows[0].region, "Honshu");
});

test("TC-03: magnitude thiếu → avg/max = null, eventCount vẫn tăng", () => {
  const rows = buildMonitoringRegionRows([
    event({ sourceEventId: "a", country: "USA", region: "California", magnitude: 5 }),
    event({ sourceEventId: "b", country: "USA", region: "California", magnitude: Number.NaN }),
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].eventCount, 2);
  assert.equal(rows[0].avgMagnitude, 5);
  assert.equal(rows[0].maxMagnitude, 5);

  const onlyInvalid = buildMonitoringRegionRows([
    event({ country: "Tonga", region: "Tonga", magnitude: Number.NaN }),
  ]);
  assert.equal(onlyInvalid[0].avgMagnitude, null);
  assert.equal(onlyInvalid[0].maxMagnitude, null);
  assert.equal(onlyInvalid[0].eventCount, 1);
});

test("TC-04: merge dedupe theo cặp, ưu tiên dòng có sự kiện thật, giữ dòng fallback", () => {
  const primary = buildMonitoringRegionRows([
    event({ country: "USA", region: "California", magnitude: 5.2 }),
  ]);
  const fallback: RegionClusterRow[] = [
    { country: "USA", region: "California", eventCount: 9, avgMagnitude: 3, maxMagnitude: 3 },
    { country: "Japan", region: "Honshu", eventCount: 2, avgMagnitude: 4, maxMagnitude: 4 },
  ];

  const merged = mergeRegionRows(primary, fallback);

  assert.equal(merged.length, 2);
  const california = merged.find((row) => row.country === "USA" && row.region === "California");
  assert.ok(california);
  assert.equal(california.eventCount, 1); // dòng sự kiện thật thắng dòng cụm cũ
  assert.ok(merged.some((row) => row.country === "Japan" && row.region === "Honshu"));
  assert.equal(merged[0].eventCount, 2); // sort giảm dần
});

test("TC-05: URL tile mặc định là cùng origin /tile", () => {
  assert.equal(resolveTileUrl({}), DEFAULT_TILE_URL);
  assert.equal(resolveTileUrl({ VITE_MAP_TILE_URL: "  " }), DEFAULT_TILE_URL);
});

test("TC-06: URL tile có thể override bằng VITE_MAP_TILE_URL", () => {
  const custom = "https://tiles.example.com/dark/{z}/{x}/{y}.png";
  assert.equal(resolveTileUrl({ VITE_MAP_TILE_URL: custom }), custom);
  assert.equal(resolveTileUrl({ VITE_MAP_TILE_URL: `  ${custom}  ` }), custom);
});

test("TC-07: toMapEarthquake truyền country/region từ payload BE", () => {
  const mapped = toMapEarthquake({
    id: 7,
    source: "USGS",
    source_event_id: "us_007",
    place: "17 km SE of Naalehu, Hawaii",
    event_time: "2026-11-23T01:02:03Z",
    latitude: 19.1,
    longitude: -155.5,
    depth_km: 12,
    magnitude: 4.1,
    country: "USA",
    region: "Hawaii",
  });

  assert.equal(mapped.country, "USA");
  assert.equal(mapped.region, "Hawaii");
});

test("TC-08: sortEventsByTimeDesc xếp mới nhất lên đầu, timestamp hỏng xuống cuối", () => {
  const sorted = sortEventsByTimeDesc([
    event({ sourceEventId: "old", eventTime: "2026-11-20T00:00:00Z", magnitude: 8 }),
    event({ sourceEventId: "new", eventTime: "2026-11-23T00:00:00Z", magnitude: 2 }),
    event({ sourceEventId: "bad", eventTime: "not-a-date", magnitude: 6 }),
  ]);

  assert.deepEqual(
    sorted.map((item) => item.sourceEventId),
    ["new", "old", "bad"],
  );
});

test("TC-09: sseRefreshKey nhận mọi event dữ liệu, bỏ heartbeat", () => {
  const packet = {
    event: "ingestion_cycle_completed",
    data: {},
    timestamp: "2026-11-23T00:00:00Z",
    id: "gdmas-1",
  } as SSEEventPayload;

  assert.ok(sseRefreshKey(packet));
  assert.ok(sseRefreshKey({ ...packet, event: "earthquake_detected" }));
  assert.ok(sseRefreshKey({ ...packet, event: "earthquake_alert" }));
  assert.equal(sseRefreshKey({ ...packet, event: "heartbeat" }), null);
  assert.equal(sseRefreshKey(null), null);
  assert.notEqual(
    sseRefreshKey(packet),
    sseRefreshKey({ ...packet, id: "gdmas-2" }),
    "mỗi chu kỳ có id mới phải tạo key mới để refetch",
  );
});
