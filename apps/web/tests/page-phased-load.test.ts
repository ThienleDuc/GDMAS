/** Test offline: page tải theo 2 phase, bỏ request vô dụng (2026-11-23). */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = resolve(import.meta.dirname, "../src");
const read = (path: string): string => readFileSync(resolve(src, path), "utf8");

test("TC-01: useEarthquakeInsights có flag optional, default true", () => {
  const code = read("hooks/useEarthquakeInsights.ts");
  assert.match(code, /EarthquakeInsightsOptions/u);
  assert.match(code, /includeTemporal\?: boolean/u);
  assert.match(code, /includeClusters\?: boolean/u);
  assert.match(code, /includeTemporal !== false/u);
  assert.match(code, /includeTemporal[\s\S]*Promise\.resolve\(null\)/u);
});

test("TC-02: phase 1 Overview = trend + 5 sự kiện", () => {
  const code = read("features/overview/useOverviewData.ts");
  assert.equal((code.match(/Promise\.allSettled\(\[/gu) ?? []).length, 2);
  assert.match(code, /getTrendAnalysis\(/u);
  assert.match(code, /limit: 5,/u);
  assert.match(code, /includeTemporal: false/u);
});

test("TC-03: bỏ request seasonality month vô dụng, giữ field tương thích", () => {
  const code = read("features/overview/useOverviewData.ts");
  assert.doesNotMatch(code, /interval: "month"/u);
  assert.match(code, /seasonalityMonthly: SeasonalityResponse \| null/u);
  assert.match(code, /seasonalityMonthly: null/u);
  assert.match(code, /getSeasonalityAnalysis\(geoQuery\(filter\), controller\.signal\)/u);
});

test("TC-04: phase 2 defer + phân biệt Loading/Empty", () => {
  const code = read("features/overview/useOverviewData.ts");
  assert.match(code, /secondaryEnabled/u);
  assert.match(code, /scheduleIdle/u);
  assert.match(code, /secondaryLoading: true/u);
  assert.match(code, /loading: state\.loading \|\| insights\.loading \|\| state\.secondaryLoading/u);
  const page = read("features/overview/OverviewPage.tsx");
  assert.match(page, /ov-secondary-status/u);
  assert.match(page, /Đang tải dữ liệu xếp hạng/u);
});

test("TC-06: 5 pattern page là chunk riêng", () => {
  const routes = read("features/statistics/StatisticsRoutes.tsx");
  assert.doesNotMatch(routes, /from "\.\/patterns\/index\.ts"/u);
  for (const name of [
    "TemporalPatternPage",
    "TrendPatternPage",
    "SeasonalityPatternPage",
    "CorrelationPatternPage",
    "ForecastClassificationPatternPage",
  ]) {
    assert.match(routes, new RegExp(`const ${name} = React\\.lazy\\(`, "u"), `${name} chưa lazy`);
    assert.match(routes, new RegExp(`import\\("\\.\\/patterns\\/${name}"\\)`, "u"));
  }
  const layout = read("features/statistics/StatisticsLayout.tsx");
  assert.match(layout, /React\.Suspense/u);
  assert.match(layout, /stat-pattern-loading/u);
});

test("TC-05: Earthquakes tắt 2 nguồn không dùng", () => {
  const page = read("features/earthquakes/EarthquakesPage.tsx");
  assert.match(page, /includeTemporal: false/u);
  assert.match(page, /includeClusters: false/u);
});
