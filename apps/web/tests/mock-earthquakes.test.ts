import assert from "node:assert/strict";
import test from "node:test";
import { createEarthquakeList, slicePage } from "./mocks/earthquakes-list.ts";
import { buildMagnitudeHistogram } from "../src/features/earthquakes/magnitude-histogram.ts";
import { ALL_COUNTRIES, countriesFromItems, filterItemsByCountry } from "../src/features/earthquakes/country-filter.ts";

test("TC-01: createEarthquakeList tạo 40 bản ghi UTC/WGS84 đa dạng", () => {
  const items = createEarthquakeList();
  assert.equal(items.length, 40);
  assert.ok(items.every((item) => item.event_time.endsWith("Z")));
  assert.ok(items.every((item) => item.latitude >= -90 && item.latitude <= 90));
  assert.ok(items.every((item) => item.longitude >= -180 && item.longitude <= 180));
  assert.ok(new Set(items.map((item) => item.magnitude)).size > 5);
  assert.ok(new Set(items.map((item) => item.place)).size > 3);
});

test("TC-02: slicePage phân trang đúng", () => {
  const items = createEarthquakeList();
  const first = slicePage(items, 1, 20);
  assert.equal(first.data.length, 20);
  assert.equal(first.total, 40);
  assert.equal(first.total_pages, 2);
  assert.equal(first.page, 1);

  const second = slicePage(items, 2, 20);
  assert.equal(second.data.length, 20);
  assert.notEqual(second.data[0].id, first.data[0].id);

  const clamped = slicePage(items, 99, 20);
  assert.equal(clamped.page, 2);
});

test("TC-04: countriesFromItems và filterItemsByCountry", () => {
  const items = createEarthquakeList();
  const countries = countriesFromItems(items);
  assert.ok(countries.length >= 5);
  assert.deepEqual(countries, [...countries].sort((a, b) => a.localeCompare(b)));
  assert.equal(filterItemsByCountry(items, ALL_COUNTRIES).length, items.length);
  const japan = filterItemsByCountry(items, "Japan");
  assert.ok(japan.length > 0 && japan.length < items.length);
  assert.ok(japan.every((item) => item.place.includes("Japan") || item.place.includes("Honshu")));
  assert.deepEqual(filterItemsByCountry(items, "Không có"), []);
});

test("TC-03: buildMagnitudeHistogram đếm và tính tỷ lệ", () => {
  const items = createEarthquakeList();
  const bins = buildMagnitudeHistogram(items);
  assert.equal(bins.length, 4);
  assert.equal(bins.reduce((sum, bin) => sum + bin.count, 0), items.length);
  assert.ok(bins.every((bin) => bin.ratio >= 0 && bin.ratio <= 100));
  assert.equal(buildMagnitudeHistogram([])[0].ratio, 0);
});
