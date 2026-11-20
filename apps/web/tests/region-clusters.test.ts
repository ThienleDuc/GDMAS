/**
 * Test offline cho cụm quốc gia/khu vực dùng trong panel lọc (Revision 2026-11-21).
 * TC-19, TC-20 trong .agents/notes/testcase/2026-11-21-monitoring-leaflet-map-markers-thien.md
 */

import test from "node:test";
import assert from "node:assert/strict";
import { buildRegionClusters } from "../src/features/monitoring/region-clusters.ts";
import { fetchRegionClusters, getMockRegionClusters } from "../src/features/monitoring/mock-region-clusters.ts";

test("TC-19: buildRegionClusters gom theo quốc gia/khu vực, đếm và tính độ lớn", () => {
  const rows = buildRegionClusters([
    { place: "12 km NE of San Francisco, CA", magnitude: 4.2 },
    { place: "Central California, USA", magnitude: 4.6 },
    { place: "Off the east coast of Honshu, Japan", magnitude: 6.0 },
    { place: "Off the east coast of Honshu, Japan", magnitude: 5.0 },
    { place: null, magnitude: 3.0 },
  ]);

  const honshu = rows.find((row) => row.country === "Japan" && row.region === "Honshu");
  assert.ok(honshu);
  assert.equal(honshu.eventCount, 2);
  assert.equal(honshu.avgMagnitude, 5.5);
  assert.equal(honshu.maxMagnitude, 6.0);

  assert.ok(rows.some((row) => row.country === "USA" && row.region === "San Francisco"));
  assert.ok(rows.some((row) => row.country === "Khác" && row.region === "Khác"));
  assert.equal(rows.reduce((sum, row) => sum + row.eventCount, 0), 5);
});

test("TC-20: mock cụm trả dữ liệu giả lập có shape đúng để thay bằng API sau", async () => {
  const rows = getMockRegionClusters();
  assert.ok(rows.length >= 8);
  assert.ok(rows.every((row) => row.eventCount > 0));
  assert.ok(rows.every((row) => row.avgMagnitude === null || Number.isFinite(row.avgMagnitude)));

  const honshu = rows.find((row) => row.country === "Japan" && row.region === "Honshu");
  assert.ok(honshu);
  assert.equal(honshu.eventCount, 21);
  assert.ok(honshu.avgMagnitude !== null && honshu.avgMagnitude > 5);

  assert.deepEqual(await fetchRegionClusters(), rows);
});
