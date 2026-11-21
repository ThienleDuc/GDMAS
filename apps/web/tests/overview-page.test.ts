/** Test tĩnh cho cấu trúc trang Tổng quan — testcase 2026-11-21-overview-dashboard-thien. */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../src");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

const app = read("app/App.tsx");
const page = read("features/overview/OverviewPage.tsx");
const css = read("features/overview/OverviewPage.css");
const indexCss = read("styles/index.css");
const barrel = read("components/charts/index.ts");
const hotspots = read("components/charts/OverviewHotspotsChart.tsx");

test("TC-10: App dùng OverviewPage, đủ 4 chart + bảng xếp hạng + live feed + status strip", () => {
  assert.match(app, /<OverviewPage\s*\/?>/u);
  assert.doesNotMatch(app, /element=\{<PlaceholderPage title="Tổng quan" \/>\}/u); // chỉ còn làm Suspense fallback
  assert.match(app, /React\.lazy/u); // giữ Recharts khỏi main bundle

  assert.match(page, /OverviewTrendChart/u);
  assert.match(page, /OverviewSeverityChart/u);
  assert.match(page, /OverviewHotspotsChart/u);
  assert.match(page, /OverviewSeasonalityChart/u);
  assert.match(page, /useCatalogSelection/u);
  assert.match(page, /useSseMarkers/u); // không mở EventSource thứ 2
  assert.doesNotMatch(page, /createEventSource|new EventSource|mock-region-clusters/u);

  for (const marker of ["ov-forecast", "onSelect={handleRankSelect}", "ov-inline-link", "ov-live"]) {
    assert.ok(page.includes(marker), `thiếu widget: ${marker}`);
  }
  assert.doesNotMatch(page, /ov-card__head/u); // header card đã bị gỡ
  assert.doesNotMatch(page, /ov-card--12|buildTerminalRows|ov-terminals/u); // card G đã bị gỡ

  assert.match(page, /<th>Mức độ<\/th>/u);
  assert.match(hotspots, /Độ lớn TB<\/th>/u);
  assert.match(hotspots, /Độ lớn cao nhất<\/th>/u);
  assert.match(hotspots, /<th>Mức độ<\/th>/u);
  assert.match(hotspots, /severityLabel\(row\.maxMagnitude\)/u);
  assert.match(hotspots, /ov-rank-index/u);
  assert.match(hotspots, /ov-cell-count/u);
  assert.match(page, /ov-cell-time/u);
  assert.match(page, /ov-cell-place/u);
  assert.match(page, /ov-cell-coord/u);
  assert.match(page, /ov-forecast__highlight/u);
  assert.match(css, /ov-forecast__highlight/u);
  assert.match(css, /\.ov-forecast__meta\s*\{[^}]*font-size:\s*var\(--text-sm\)/u);

  assert.match(barrel, /OverviewTrendChart/u);
  assert.match(barrel, /OverviewSeverityChart/u);
  assert.match(barrel, /OverviewHotspotsChart/u);
  assert.match(barrel, /OverviewSeasonalityChart/u);
  assert.match(indexCss, /OverviewPage\.css/u);
});

test("TC-11: grid 12/6/1, dùng design token, không hardcode màu", () => {
  assert.match(css, /grid-template-columns:\s*repeat\(12,\s*minmax\(0,\s*1fr\)\)/u);
  assert.match(css, /@media\s*\(max-width:\s*1023px\)[\s\S]{0,160}repeat\(6,/u);
  assert.match(css, /@media\s*\(max-width:\s*767px\)[\s\S]{0,160}minmax\(0,\s*1fr\)/u);
  assert.match(css, /var\(--card\)/u);
  assert.match(css, /var\(--primary\)/u);
  assert.match(css, /prefers-reduced-motion/u);
  assert.doesNotMatch(css, /ov-card__head/u);
  assert.doesNotMatch(css, /ov-card--12|ov-terminal/u);
  assert.match(css, /\.ov-severity--high/u);
  assert.match(css, /\.ov-severity--medium/u);
  assert.match(css, /\.ov-severity--low/u);
  assert.match(css, /\.ov-page \.ds-table-wrapper\s*\{[^}]*border:\s*1px solid var\(--border\)/u);
  assert.match(css, /\.ov-page \.ds-table/u);
  assert.match(css, /\.ov-rank-index/u);
  assert.match(css, /\.ov-cell-place/u);
  assert.match(css, /var\(--table-header-height\)/u);
  assert.match(css, /var\(--table-row-height\)/u);
  assert.doesNotMatch(css, /#[\da-f]{3,8}\b/iu);
});
