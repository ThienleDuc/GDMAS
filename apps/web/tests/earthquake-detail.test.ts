/**
 * Test offline cho helper panel chi tiết sự kiện (RD-13).
 * Không gọi mạng — fixture EarthquakeItem dựng inline (contract example có raw_data:null).
 * Chạy: cd apps/web && node --test tests/earthquake-detail.test.ts
 */

import test from "node:test";
import assert from "node:assert/strict";
import type { EarthquakeItem } from "../src/contracts/earthquake.ts";
import { ApiError } from "../src/lib/api-client.ts";
import { detailFields, isNotFound, rawDataSummary } from "../src/features/earthquakes/earthquake-detail.ts";

const FULL: EarthquakeItem = {
  id: 1042,
  source: "USGS",
  source_event_id: "us7000m123",
  event_time: "2026-11-06T10:45:22Z",
  latitude: 35.6895,
  longitude: 139.6917,
  depth_km: 15.4,
  magnitude: 5.8,
  magnitude_type: "mww",
  place: "82 km ENE of Tokyo, Japan",
  source_url: "https://earthquake.usgs.gov/earthquakes/eventpage/us7000m123",
  ingested_at: "2026-11-06T10:50:00Z",
  raw_data: {
    type: "Feature",
    geometry: { type: "Point", coordinates: [139.6917, 35.6895, 15.4] },
    properties: { mag: 5.8, place: "82 km ENE of Tokyo, Japan" },
  },
};

const MINIMAL: EarthquakeItem = {
  id: 7,
  source: "USGS",
  source_event_id: "us_test_007",
  event_time: "2026-11-06T10:45:22Z",
  latitude: 10,
  longitude: 100,
  depth_km: 10,
  magnitude: 4,
};

test("TC-01 — đủ field canonical + field optional khi có", () => {
  const fields = detailFields(FULL, "UTC");
  const byLabel = Object.fromEntries(fields.map((field) => [field.label, field.value]));

  assert.equal(byLabel["Mã nguồn"], "us7000m123");
  assert.equal(byLabel["Độ lớn"], "5.8");
  assert.equal(byLabel["Độ sâu"], "15.4 km");
  assert.equal(byLabel["Loại độ lớn"], "mww");
  assert.equal(byLabel["Liên kết gốc"], FULL.source_url);
  assert.equal(byLabel["Địa điểm"], FULL.place);
  assert.ok(byLabel["Nạp lúc"].endsWith(" UTC"));
  assert.equal(byLabel["Dữ liệu gốc"], "Có GeoJSON gốc (USGS)");
  assert.match(byLabel["Toạ độ WGS84"], /35\.6895/);
});

test("TC-02 — field optional thiếu → bỏ qua, không số giả", () => {
  const fields = detailFields(MINIMAL, "UTC");
  const labels = fields.map((field) => field.label);

  assert.ok(!labels.includes("Loại độ lớn"));
  assert.ok(!labels.includes("Liên kết gốc"));
  assert.ok(!labels.includes("Nạp lúc"));
  assert.ok(!labels.includes("Dữ liệu gốc"));
  assert.equal(rawDataSummary(MINIMAL), null);
  assert.equal(rawDataSummary({ ...MINIMAL, raw_data: null }), null);
});

test("TC-03 — raw_data object → nhãn; sai shape → null", () => {
  assert.equal(rawDataSummary(FULL), "Có GeoJSON gốc (USGS)");
  assert.equal(rawDataSummary({ ...MINIMAL, raw_data: {} }), null);
  assert.equal(rawDataSummary({ ...MINIMAL, raw_data: [] as unknown as Record<string, unknown> }), null);
});

test("TC-04 — UTC và UTC+7 khác nhau đúng 7 giờ", () => {
  const utc = detailFields(FULL, "UTC").find((field) => field.label === "Thời gian");
  const local = detailFields(FULL, "UTC+7").find((field) => field.label === "Thời gian");

  assert.ok(utc && local);
  assert.ok(utc.value.endsWith(" UTC"));
  assert.ok(local.value.endsWith(" (UTC+7)"));
  assert.notEqual(utc.value, local.value);
});

test("TC-05/06 — 404 là not_found, 500 không phải", () => {
  assert.equal(isNotFound(new ApiError("Không tìm thấy", 404)), true);
  assert.equal(isNotFound(new ApiError("Lỗi", 500)), false);
  assert.equal(isNotFound(new Error("offline")), false);
});
