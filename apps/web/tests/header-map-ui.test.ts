/**
 * Test offline cho 4 chỉnh UI ngày 2026-11-23 (Fast-Track):
 * dropdown quốc gia có tìm kiếm, bỏ layout__system, preset tối đa 30 ngày, bỏ eq-page__actions.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolve } from "node:path";

const src = resolve(import.meta.dirname, "../src");
const read = (relative: string): string => readFileSync(resolve(src, relative), "utf8");

test("TC-01: dropdown quốc gia có ô tìm kiếm + listbox", () => {
  const component = read("layouts/header/GlobalCountryFilter.tsx");
  assert.match(component, /id="global-country-select"/u);
  assert.match(component, /type="search"/u);
  assert.match(component, /placeholder="Tìm quốc gia/u);
  assert.match(component, /role="listbox"/u);
  assert.match(component, /aria-expanded=\{open\}/u);
});

test("TC-02: CSS dropdown dùng token chiều cao, có search/options", () => {
  const css = read("layouts/layout.css");
  assert.match(css, /\.layout__country-select\s*\{[^}]*height:\s*var\(--button-height-sm\)/su);
  assert.match(css, /\.layout__country-dropdown/u);
  assert.match(css, /\.layout__country-search input/u);
  assert.match(css, /\.layout__country-options/u);
});

test("TC-03: bỏ class layout__system trên <details>", () => {
  const component = read("layouts/header/SystemStatusPanel.tsx");
  assert.doesNotMatch(component, /className="layout__system"/u);
  assert.match(component, /layout__system-summary/u);
});

test("TC-04: bản đồ realtime — không còn bộ lọc thời gian", () => {
  const component = read("components/map/MapControlsPanel.tsx");
  assert.doesNotMatch(component, /PRESETS|timeRangeLabel/u);
  assert.doesNotMatch(component, /Khoảng thời gian/u);
  assert.match(component, /realtime/u);

  // CSS cũ được giữ lại (RULE-03/I2) nhưng không còn component nào render preset thời gian.
});

test("TC-05: xoá eq-page__actions", () => {
  const page = read("features/earthquakes/EarthquakesPage.tsx");
  assert.doesNotMatch(page, /eq-page__actions/u);
  const css = read("features/earthquakes/EarthquakesPage.css");
  assert.doesNotMatch(css, /eq-page__actions/u);
});
