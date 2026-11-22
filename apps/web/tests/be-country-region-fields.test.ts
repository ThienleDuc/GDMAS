/**
 * Test offline: FE ưu tiên field country/region do BE suy từ place, vẫn giữ fallback cũ.
 * testcase 2026-11-22-be-country-region-derivation-thien (TC-08).
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  ALL_COUNTRIES,
  countriesFromItems,
  countryOf,
  filterItemsByCountry,
} from "../src/features/earthquakes/country-filter.ts";
import {
  ALL_REGIONS,
  countriesFromPlaces,
  filterByCountryAndRegion,
  regionOf,
  regionsFromItems,
} from "../src/features/earthquakes/region-filter.ts";
import type { EarthquakeItem } from "../src/contracts/earthquake.ts";

const item = (overrides: Partial<EarthquakeItem> = {}): EarthquakeItem => ({
  id: 1,
  source: "USGS",
  source_event_id: "us-test",
  event_time: "2026-11-22T00:00:00Z",
  latitude: 38.29,
  longitude: 142.38,
  depth_km: 24.5,
  magnitude: 5.8,
  place: "Honshu, Japan",
  ...overrides,
});

test("TC-08: ưu tiên country/region từ BE", () => {
  const beItem = item({ country: "Japan", region: "Honshu" });
  assert.equal(countryOf(beItem), "Japan");
  assert.equal(regionOf(beItem, "Japan"), "Honshu");
});

test("tên bang Mỹ đầy đủ cũng map sang USA (khớp BE)", () => {
  const tennessee = item({ place: "10 km W of Nashville, Tennessee" });
  assert.equal(countryOf(tennessee), "USA");
  assert.equal(regionOf(tennessee, "USA"), "Nashville");
});

test("mã quốc gia MX → Mexico (khớp BE)", () => {
  const mexico = item({ place: "20 km SW of Ensenada, MX" });
  assert.equal(countryOf(mexico), "Mexico");
  assert.equal(regionOf(mexico, "Mexico"), "Ensenada");
});

test("fallback khi BE chưa trả field (RULE-03)", () => {
  const legacy = item();
  assert.equal(countryOf(legacy), "Japan");
  assert.equal(regionOf(legacy, "Japan"), "Honshu");
  assert.equal(countryOf(item({ place: null })), "Khác");
  assert.equal(regionOf(item({ place: null }), "Khác"), "Khác");
});

test("danh sách & bộ lọc dùng field BE", () => {
  const japan = item({ id: 1, country: "Japan", region: "Honshu" });
  const indonesia = item({
    id: 2,
    source_event_id: "us-test-2",
    place: "Java, Indonesia",
    country: "Indonesia",
    region: "Java",
  });
  const items = [japan, indonesia];

  assert.deepEqual(countriesFromItems(items), ["Indonesia", "Japan"]);
  assert.deepEqual(countriesFromPlaces(items), ["Indonesia", "Japan"]);
  assert.deepEqual(regionsFromItems(items, "Japan"), ["Honshu"]);
  assert.deepEqual(filterItemsByCountry(items, "Japan").map((e) => e.id), [1]);
  assert.deepEqual(filterByCountryAndRegion(items, "Japan", "Honshu").map((e) => e.id), [1]);
  assert.equal(filterByCountryAndRegion(items, "Japan", "Java").length, 0);
  assert.equal(filterItemsByCountry(items, ALL_COUNTRIES).length, 2);
  assert.equal(filterByCountryAndRegion(items, ALL_COUNTRIES, ALL_REGIONS).length, 2);
});
