/**
 * Test offline cho cụm quốc gia/khu vực dùng trong panel lọc (RD-15/GAP-05).
 * Không mock runtime — mock fetch bằng payload `/api/v1/clusters` thật.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolve } from "node:path";
import {
  buildRegionClusterRows,
  buildRegionClusters,
} from "../src/features/monitoring/region-clusters.ts";

const CLUSTERS_PAYLOAD = {
  success: true,
  data: {
    clusters: [
      {
        cluster_id: 1,
        center_latitude: 38.2,
        center_longitude: 142.4,
        event_count: 21,
        avg_magnitude: 5.6,
        max_magnitude: 6.4,
        dominant_place: "Honshu, Japan",
      },
      {
        cluster_id: 2,
        center_latitude: -6.2,
        center_longitude: 106.8,
        event_count: 15,
        avg_magnitude: 5.2,
        max_magnitude: 5.9,
        dominant_place: "Java, Indonesia",
      },
    ],
  },
};

test("TC-19: buildRegionClusters gom sự kiện theo quốc gia/khu vực", () => {
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
  assert.equal(rows.reduce((sum, row) => sum + row.eventCount, 0), 5);
});

test("TC-01/02 — cụm thật map dominant_place → country/region, dùng event_count thật", () => {
  const rows = buildRegionClusterRows(CLUSTERS_PAYLOAD.data.clusters);
  assert.equal(rows.length, 2);

  const japan = rows.find((row) => row.country === "Japan");
  assert.ok(japan);
  assert.equal(japan.eventCount, 21, "Phải dùng event_count của cụm, không phải 1");
  assert.equal(japan.avgMagnitude, 5.6);
  assert.equal(japan.maxMagnitude, 6.4);

  const indonesia = rows.find((row) => row.country === "Indonesia");
  assert.ok(indonesia);
  assert.equal(indonesia.eventCount, 15);
});

test("TC-03 — avg_magnitude/max_magnitude null → không bịa số", () => {
  const rows = buildRegionClusterRows([
    {
      cluster_id: 3,
      center_latitude: 35.7,
      center_longitude: -118.5,
      event_count: 7,
      avg_magnitude: null,
      max_magnitude: null,
      dominant_place: "California, USA",
    },
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].eventCount, 7);
  assert.equal(rows[0].avgMagnitude, null);
  assert.equal(rows[0].maxMagnitude, null);
});
