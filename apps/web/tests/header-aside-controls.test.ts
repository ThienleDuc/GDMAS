/**
 * Test offline cho việc dời countdown/toggle xuống aside và bỏ select lọc cục bộ trên histogram.
 * .agents/notes/testcase/2026-11-23-earthquakes-filter-header-controls-thien.md — TC-03..TC-08.
 * Không render DOM, không gọi mạng: chỉ test hàm thuần + đọc source tĩnh (I7).
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { compactCountdownLabel } from "../src/layouts/header/header-data.ts";

const root = resolve(import.meta.dirname, "../src");
const read = (relative: string): string => readFileSync(resolve(root, relative), "utf8");

const layout = read("layouts/DashboardLayout.tsx");
const actions = read("layouts/header/HeaderActions.tsx");
const countdown = read("layouts/header/CompactRefreshCountdown.tsx");
const toastHost = read("layouts/header/RefreshToastHost.tsx");
const histogram = read("features/earthquakes/components/MagnitudeHistogramChart.tsx");
const filterBar = read("features/earthquakes/components/EarthquakeFilterBar.tsx");
const layoutCss = read("layouts/layout.css");

test("TC-03: compactCountdownLabel — 5:00 / 2:05 / biên an toàn", () => {
  assert.equal(compactCountdownLabel(300), "5:00");
  assert.equal(compactCountdownLabel(125), "2:05");
  assert.equal(compactCountdownLabel(0), "5:00");
  assert.equal(compactCountdownLabel(Number.NaN), "5:00");
});

test("TC-05: footer aside render countdown trước ThemeToggle", () => {
  const footerIndex = layout.indexOf("layout__sidebar-footer");
  const countdownIndex = layout.indexOf("<CompactRefreshCountdown");
  const toggleIndex = layout.indexOf("<ThemeToggle");
  assert.ok(footerIndex >= 0, "thiếu layout__sidebar-footer");
  assert.ok(countdownIndex > footerIndex, "countdown phải nằm trong footer aside");
  assert.ok(toggleIndex > countdownIndex, "ThemeToggle phải nằm dưới countdown");
  assert.match(countdown, /role="timer"/u);
  assert.match(countdown, /compactCountdownLabel/u);
  assert.match(countdown, /onRefresh/u);
});

test("TC-06: header bỏ countdown/toggle, giữ region filter + toast host", () => {
  assert.doesNotMatch(actions, /<DataRefreshLabel/u);
  assert.doesNotMatch(actions, /<ThemeToggle/u);
  assert.match(actions, /<GlobalRegionFilter\s*\/>/u);
  assert.match(actions, /<RefreshToastHost/u);
  assert.match(toastHost, /dataRefreshKey/u);
  assert.match(toastHost, /<RefreshToast/u);
});

test("TC-07: histogram không còn select quốc gia/khu vực cục bộ", () => {
  assert.doesNotMatch(histogram, /aria-label="Lọc theo quốc gia"/u);
  assert.doesNotMatch(histogram, /aria-label="Lọc theo khu vực"/u);
  assert.match(histogram, /eq-country-chart__context/u);
  assert.match(histogram, /ALL_COUNTRIES/u);
  assert.match(histogram, /ALL_REGIONS/u);
});

test("TC-08: nút áp dụng bộ lọc có nhãn 'Áp dụng'", () => {
  assert.match(filterBar, /eq-filter-apply-label/u);
  assert.match(filterBar, />Áp dụng</u);
  assert.match(filterBar, /onApply/u);
});

test("TC-09: histogram + KPI cùng nguồn dữ liệu đã lọc", () => {
  const page = read("features/earthquakes/EarthquakesPage.tsx");
  assert.match(page, /buildCatalogStatistics/u);
  assert.match(page, /chartFiltered/u);
  assert.match(page, /statistics=\{chartLoaded \? catalogStats : insights\.statistics\}/u);
  assert.match(page, /setChartTotal\(result\.total\)/u);
  const insightsFile = read("features/earthquakes/earthquake-insights.ts");
  assert.match(insightsFile, /export function buildCatalogStatistics/u);
});

test("TC-CSS: footer/countdown/region có style dùng design token", () => {
  assert.match(layoutCss, /\.layout__sidebar-footer\s*\{[^}]*flex-direction:\s*column/u);
  assert.match(layoutCss, /\.layout__refresh-compact\s*\{[^}]*font-variant-numeric:\s*tabular-nums/u);
  assert.match(layoutCss, /\.layout__region-select\s*\{/u);
  assert.match(layoutCss, /\.layout__region-dropdown\s*\{/u);
  assert.doesNotMatch(layoutCss, /\.layout__region-[a-z-]+\s*\{[^}]*#[0-9a-f]{3,8}\b/iu);
});
