/**
 * Test offline cho adapter fallback cụm RD-15 (`cluster-fallback.ts`).
 * Không gọi mạng — payload legacy dựng inline theo shape demo_seeder/clustering_summary.
 * Chạy: cd apps/web && node --test tests/cluster-fallback.test.ts
 */

import test from "node:test";
import assert from "node:assert/strict";
import type { PatternsResponse } from "../src/contracts/index.ts";
import { clustersFromPatterns } from "../src/lib/transforms/cluster-fallback.ts";
import { countriesFromClusters } from "../src/layouts/header/header-data.ts";

const legacyPatterns = (clusters: unknown[]): PatternsResponse =>
  ({
    success: true,
    total_patterns: 6,
    patterns: [],
    clustering_summary: { clusters },
  }) as unknown as PatternsResponse;

const LEGACY_CLUSTER = {
  id: 0,
  name: "San Andreas - California",
  lat: 35.7,
  lon: -118.5,
  events_count: 12,
  avg_mag: 5.4,
};

test("TC-01 — map alias legacy sang ClusterSummary canonical", () => {
  const result = clustersFromPatterns(legacyPatterns([LEGACY_CLUSTER]));

  assert.ok(result);
  assert.equal(result.success, true);
  const cluster = result.data.clusters[0];
  assert.deepEqual(cluster, {
    cluster_id: 0,
    center_latitude: 35.7,
    center_longitude: -118.5,
    event_count: 12,
    avg_magnitude: 5.4,
    max_magnitude: null,
    radius_km: null,
    name: "San Andreas - California",
  });
});

test("TC-02 — payload rỗng / empty-state / thiếu clustering_summary → null", () => {
  assert.equal(clustersFromPatterns(null), null);
  assert.equal(clustersFromPatterns(undefined), null);
  assert.equal(
    clustersFromPatterns({ success: false, total_patterns: 0, patterns: [] }),
    null,
  );
  assert.equal(
    clustersFromPatterns({ success: true, total_patterns: 6, patterns: [], clustering_summary: null }),
    null,
  );
  assert.equal(
    clustersFromPatterns(legacyPatterns([])),
    null,
  );
});

test("TC-03 — không nội suy số khi legacy thiếu avg_mag / name", () => {
  const result = clustersFromPatterns(
    legacyPatterns([{ id: 2, lat: -6.2, lon: 106.8, events_count: 7 }]),
  );

  assert.ok(result);
  const cluster = result.data.clusters[0];
  assert.equal(cluster.avg_magnitude, null);
  assert.equal(cluster.max_magnitude, null);
  assert.equal(cluster.radius_km, null);
  assert.equal(cluster.name, null);
});

test("TC-04 — bỏ cụm sai WGS84 / thiếu toạ độ, không trả NaN", () => {
  const result = clustersFromPatterns(
    legacyPatterns([
      { id: 3, lat: 999, lon: 106.8, events_count: 4 },
      { id: 4, lat: -6.2, lon: -999, events_count: 4 },
      { id: 5, lat: 10, events_count: 4 },
      LEGACY_CLUSTER,
    ]),
  );

  assert.ok(result);
  assert.equal(result.data.clusters.length, 1);
  assert.equal(result.data.clusters[0].cluster_id, 0);
});

test("TC-05 — output adapter tiêu thụ được bởi countriesFromClusters (không cần mock)", () => {
  const result = clustersFromPatterns(legacyPatterns([LEGACY_CLUSTER]));
  assert.ok(result);

  const options = countriesFromClusters(result);
  assert.equal(options.length, 1);
  assert.equal(options[0].country, "USA");
  assert.equal(options[0].eventCount, 12);
});
