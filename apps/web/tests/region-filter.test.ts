/**
 * Test offline cho helper lọc quốc gia/khu vực (Revision 2026-11-21).
 * TC-13, TC-14 trong .agents/notes/testcase/2026-11-21-monitoring-leaflet-map-markers-thien.md
 */

import test from "node:test";
import assert from "node:assert/strict";
import { countryFromPlace } from "../src/features/earthquakes/country-clusters.ts";
import {
  ALL_REGIONS,
  countriesFromPlaces,
  filterByCountryAndRegion,
  regionFromPlace,
  regionsFromItems,
} from "../src/features/earthquakes/region-filter.ts";

const items = [
  { place: "12 km NE of San Francisco, CA" },
  { place: "Off the east coast of Honshu, Japan" },
  { place: "Northern Sumatra, Indonesia" },
  { place: null },
];

test("TC-13: suy quốc gia & khu vực từ place (sample USGS)", () => {
  assert.equal(countryFromPlace(items[0].place), "USA");
  assert.equal(countryFromPlace(items[1].place), "Japan");
  assert.equal(countryFromPlace(items[2].place), "Indonesia");
  assert.equal(countryFromPlace(null), "Khác");

  assert.equal(regionFromPlace(items[0].place, "USA"), "San Francisco");
  assert.equal(regionFromPlace(items[1].place, "Japan"), "Honshu");
  assert.equal(regionFromPlace(null, "USA"), "Khác");
  assert.deepEqual(countriesFromPlaces(items), ["Indonesia", "Japan", "Khác", "USA"]);
});

test("TC-14: lọc theo quốc gia rồi khu vực", () => {
  assert.deepEqual(regionsFromItems(items, "USA"), ["San Francisco"]);
  assert.deepEqual(regionsFromItems(items, "all"), []);

  assert.equal(filterByCountryAndRegion(items, "USA", ALL_REGIONS).length, 1);
  assert.equal(filterByCountryAndRegion(items, "Japan", "Honshu").length, 1);
  assert.equal(filterByCountryAndRegion(items, "Japan", "Khác").length, 0);
  assert.equal(filterByCountryAndRegion(items, "all", ALL_REGIONS).length, items.length);
});
