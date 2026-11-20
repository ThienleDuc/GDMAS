/**
 * Unit test offline cho hàm thuần bản đồ GIS (`map-data.ts`).
 * Testcase: TC-08, TC-09, TC-10, TC-11, TC-12, TC-13 trong
 * .agents/notes/testcase/2026-11-16-fe-contract-gis-reports-thien.md
 *
 * Chạy: cd apps/web && node --test tests/map-data.test.ts
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  depthToOpacity,
  filterEarthquakes,
  formatCoordinate,
  formatMetric,
  haversineKm,
  magnitudeToColor,
  magnitudeToRadius,
  normalizeClusters,
  shouldShowMarker,
  timeRangeBounds,
  toMapEarthquake,
  viewportToBbox,
} from "../src/lib/transforms/map-data.ts";

test("TC-08: Bán kính & màu marker tăng đơn điệu theo magnitude", () => {
  // Bán kính kẹp trong [4, 9] px
  assert.equal(magnitudeToRadius(0.5), 4);
  assert.equal(magnitudeToRadius(1.0), 4);
  assert.ok(magnitudeToRadius(3.5) > magnitudeToRadius(2.0));
  assert.ok(magnitudeToRadius(7.0) > magnitudeToRadius(5.0));
  assert.equal(magnitudeToRadius(8.0), 9);
  assert.equal(magnitudeToRadius(9.5), 9);
  assert.equal(magnitudeToRadius(Number.NaN), 4);

  // Thang màu theo ngưỡng
  assert.equal(magnitudeToColor(7.2), "#f43f5e"); // >= 6 đỏ
  assert.equal(magnitudeToColor(6.0), "#f43f5e");
  assert.equal(magnitudeToColor(5.5), "#f97316"); // >= 5 cam
  assert.equal(magnitudeToColor(4.2), "#facc15"); // >= 4 vàng
  assert.equal(magnitudeToColor(2.8), "#22d3ee"); // < 4 cyan
  assert.equal(magnitudeToColor(Number.NaN), "#64748b");
});

test("TC-09: Opacity theo độ sâu (0 km đậm -> 300 km nhạt)", () => {
  const shallow = depthToOpacity(0);
  const mid = depthToOpacity(70);
  const deep = depthToOpacity(300);
  const veryDeep = depthToOpacity(600);

  assert.equal(shallow, 1.0);
  assert.ok(shallow > mid);
  assert.ok(mid > deep);
  assert.equal(deep, 0.35);
  assert.equal(veryDeep, 0.35); // Kẹp trần 300km
  assert.equal(depthToOpacity(null), 0.8);
  assert.equal(depthToOpacity(undefined), 0.8);
});

test("TC-10: Chuẩn hoá cụm canonical (contracts/schemas/clusters.json)", () => {
  const canonicalInput = {
    data: {
      algorithm: "DBSCAN",
      parameters: { eps_km: 150, min_samples: 5 },
      clusters: [
        {
          cluster_id: 101,
          center_latitude: 16.0544,
          center_longitude: 108.2022,
          event_count: 42,
          avg_magnitude: 4.85,
          max_magnitude: 6.2,
          radius_km: 120,
          name: "Vùng Biển Đà Nẵng",
          dominant_place: "Da Nang, Vietnam",
        },
      ],
    },
  };

  const clusters = normalizeClusters(canonicalInput);
  assert.equal(clusters.length, 1);
  const c = clusters[0];
  assert.equal(c.clusterId, 101);
  assert.equal(c.centerLatitude, 16.0544);
  assert.equal(c.centerLongitude, 108.2022);
  assert.equal(c.eventCount, 42);
  assert.equal(c.avgMagnitude, 4.85);
  assert.equal(c.maxMagnitude, 6.2);
  assert.equal(c.radiusKm, 120);
  assert.equal(c.name, "Vùng Biển Đà Nẵng");
});

test("TC-11: Chuẩn hoá cụm alias legacy (id/lat/lon/events_count/avg_mag)", () => {
  const legacyInput = {
    clustering_summary: {
      clusters: [
        {
          id: 5,
          lat: 21.0285,
          lon: 105.8542,
          events_count: 18,
          avg_mag: 3.4,
          name: "Khu vực Hà Nội",
        },
      ],
    },
    parameters: { eps_degrees: 1.0 },
  };

  const clusters = normalizeClusters(legacyInput);
  assert.equal(clusters.length, 1);
  const c = clusters[0];
  assert.equal(c.clusterId, 5);
  assert.equal(c.centerLatitude, 21.0285);
  assert.equal(c.centerLongitude, 105.8542);
  assert.equal(c.eventCount, 18);
  assert.equal(c.avgMagnitude, 3.4);
  assert.equal(c.maxMagnitude, null);
  // eps_degrees 1.0 -> 111 km fallback
  assert.equal(c.radiusKm, 111);
  assert.equal(c.name, "Khu vực Hà Nội");
});

test("TC-12: Haversine & viewport bounding box WGS84", () => {
  // Khoảng cách Hà Nội (21.0285, 105.8542) - Đà Nẵng (16.0544, 108.2022) ~ 627 km
  const dist = haversineKm(
    { latitude: 21.0285, longitude: 105.8542 },
    { latitude: 16.0544, longitude: 108.2022 }
  );
  assert.ok(dist > 600 && dist < 650, `Khoảng cách tính được: ${dist} km`);

  // Bounding box kẹp vĩ độ [-90, 90] và kinh độ [-180, 180]
  const bbox = viewportToBbox({
    north: 95,
    south: -100,
    east: 190,
    west: -190,
  });
  assert.ok(bbox !== null);
  assert.equal(bbox.maxLat, 90);
  assert.equal(bbox.minLat, -90);
  assert.ok(bbox.minLon >= -180 && bbox.maxLon <= 180);
});

test("TC-13: Lọc marker theo độ lớn và khoảng thời gian", () => {
  const eventA = {
    magnitude: 4.5,
    eventTime: "2026-11-16T12:00:00Z",
  };
  const eventB = {
    magnitude: 2.1,
    eventTime: "2026-11-16T12:00:00Z",
  };

  assert.equal(shouldShowMarker(eventA, { minMagnitude: 3.0 }), true);
  assert.equal(shouldShowMarker(eventB, { minMagnitude: 3.0 }), false);

  // Lọc theo thời gian
  assert.equal(
    shouldShowMarker(eventA, {
      minMagnitude: 2.0,
      startTime: "2026-11-16T10:00:00Z",
      endTime: "2026-11-16T14:00:00Z",
    }),
    true
  );
  assert.equal(
    shouldShowMarker(eventA, {
      minMagnitude: 2.0,
      startTime: "2026-11-16T13:00:00Z",
    }),
    false
  );
});
