/** Test offline: Statistics chỉ fetch nguồn của sub-route đang active. */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = resolve(import.meta.dirname, "../src");
const read = (path: string): string => readFileSync(resolve(src, path), "utf8");

test("TC-01: usePanel có cờ enabled, không fetch khi tắt", () => {
  const code = read("features/statistics/statistics-data.tsx");
  assert.match(code, /export function usePanel</u);
  assert.match(code, /enabled = true/u);
  assert.match(code, /if \(!enabled\) \{/u);
  assert.match(code, /\}, \[\.\.\.deps, enabled\]\)/u);
});

test("TC-02: provider xác định slug active từ location", () => {
  const code = read("features/statistics/statistics-data.tsx");
  assert.match(code, /useLocation\(\)/u);
  assert.match(code, /patternSlugFor\(pathname\)/u);
  assert.match(code, /activeSlug === "bieu-dien-thoi-gian"/u);
  assert.match(code, /activeSlug === "du-bao-phan-loai"/u);
});

test("TC-03: mỗi nguồn có cờ riêng, P5+P6 dùng chung cờ forecast", () => {
  const code = read("features/statistics/statistics-data.tsx");
  for (const flag of [
    "enabled.temporal",
    "enabled.trend",
    "enabled.seasonality",
    "enabled.correlation",
    "enabled.forecast",
  ]) {
    assert.ok(code.includes(flag), `thiếu ${flag}`);
  }
  assert.equal((code.match(/enabled\.forecast,/gu) ?? []).length, 2);
});

test("TC-04: không đổi API/contract, filter vẫn được truyền", () => {
  const code = read("features/statistics/statistics-data.tsx");
  assert.match(code, /getTemporalAnalysis\(/u);
  assert.match(code, /interval: "day", start_time: window\.start_time, end_time: window\.end_time/u);
  assert.match(code, /timezone, \.\.\.geo/u);
  assert.match(code, /\[interval, window, timezone, country, region\]/u);
  assert.match(code, /\.\.\.geo/u);
  assert.match(code, /getPredictions\(signal, filter\)/u);
});

test("TC-06: Statistics dùng chung filter header, không chọn quốc gia ở trang con", () => {
  const layout = read("features/statistics/StatisticsLayout.tsx");
  const css = read("features/statistics/StatisticsPage.css");
  assert.doesNotMatch(layout, /CountryPicker/u);
  assert.doesNotMatch(layout, /aria-label="Lọc biểu đồ theo quốc gia"/u);
  assert.match(layout, /useCatalogSelection\(\)/u);
  assert.match(layout, /<RegionPicker \/>/u);
  assert.match(layout, /getRegionCatalog/u);
  assert.match(layout, /stat-filter-chip/u);
  assert.match(css, /\.stat-filter-chip\s*\{[^}]*background:\s*var\(--accent\)/u);
});
