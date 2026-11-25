import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import type { ClusterSummary } from "../src/contracts/clusters.ts";
import { countryFromPlace, groupClustersByCountry } from "../src/features/earthquakes/country-clusters.ts";

const fixturePath = resolve(import.meta.dirname, "../../../contracts/examples/clusters_sample.json");
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as {
  data: { clusters: ClusterSummary[] };
};

test("TC-01: countryFromPlace nhận diện quốc gia từ địa danh", () => {
  assert.equal(countryFromPlace("Off the east coast of Honshu, Japan"), "Japan");
  assert.equal(countryFromPlace("Central California"), "USA");
  assert.equal(countryFromPlace("Northern Sumatra, Indonesia"), "Indonesia");
  assert.equal(countryFromPlace("Unknown region"), "Unknown region");
  assert.equal(countryFromPlace(""), "Khác");
  assert.equal(countryFromPlace(null), "Khác");
});

test("TC-02: groupClustersByCountry gom đúng từ fixture", () => {
  const groups = groupClustersByCountry(fixture.data.clusters);
  assert.equal(groups.length, 3);
  assert.deepEqual(groups.map((group) => group.country), ["Japan", "USA", "Indonesia"]);
  assert.deepEqual(groups.map((group) => group.eventCount), [48, 45, 28]);
  assert.equal(groups[0].avgMagnitude, 4.6);
  assert.equal(groups[0].maxMagnitude, 6.1);
  assert.deepEqual(groups[0].clusterIds, [0]);
});

test("TC-03: group rỗng/trạng thái thiếu không tạo số giả", () => {
  assert.deepEqual(groupClustersByCountry([]), []);
  const grouped = groupClustersByCountry([
    { cluster_id: 9, center_latitude: 0, center_longitude: 0, event_count: 5, avg_magnitude: null, max_magnitude: null, dominant_place: "Tonga" },
  ]);
  assert.equal(grouped[0].avgMagnitude, null);
  assert.equal(grouped[0].maxMagnitude, null);
});
