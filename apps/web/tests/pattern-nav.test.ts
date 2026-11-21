/**
 * Test offline cho điều hướng con 6 nhóm phân tích (sublayout).
 * TC-12, TC-13 trong .agents/notes/testcase/2026-11-21-statistics-six-patterns-charts-thien.md
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  PATTERN_BASE_PATH,
  PATTERN_NAV,
  patternPath,
  patternSlugFor,
} from "../src/features/statistics/pattern-nav.ts";

test("TC-12: subnav 5 mục (Pattern 5 & 6 gộp), đúng thứ tự và slug duy nhất", () => {
  assert.equal(PATTERN_NAV.length, 5);
  assert.deepEqual(
    PATTERN_NAV.map((item) => item.index),
    [1, 2, 3, 4, 5],
  );
  assert.equal(new Set(PATTERN_NAV.map((item) => item.slug)).size, 5);
  assert.equal(PATTERN_NAV[4].slug, "du-bao-phan-loai");
  assert.match(PATTERN_NAV[4].label, /Dự báo và Phân loại/u);
  assert.ok(PATTERN_NAV.every((item) => item.label.length > 0 && item.description.length > 0));
  assert.ok(
    PATTERN_NAV.every(
      (item) => !/\b(pattern|analysis)\b/iu.test(item.label) || item.label.includes("Phân tích"),
    ),
  );
});

test("TC-15: biểu đồ dùng nét dày và token theme chung", () => {
  const dir = path.resolve(import.meta.dirname, "../src/components/charts");
  for (const file of [
    "TemporalPatternCharts.tsx",
    "TrendPatternChart.tsx",
    "SeasonalityPatternChart.tsx",
    "ForecastPatternChart.tsx",
  ]) {
    const source = readFileSync(path.resolve(dir, file), "utf8");
    assert.match(source, /from "\.\/chart-theme\.ts"/u, `${file} phải dùng theme chung`);
    assert.match(source, /strokeWidth=\{CHART_LINE_WIDTH\}/u, `${file} phải dùng nét dày`);
  }

  const css = readFileSync(
    path.resolve(import.meta.dirname, "../src/features/statistics/StatisticsPage.css"),
    "utf8",
  );
  assert.match(css, /\.stat-chart-block\s*\{[^}]*background:\s*var\(--surface\)/u);
  assert.match(css, /\.recharts-cartesian-axis-tick text/u);
});

test("TC-22: giao diện dùng cụm từ tiếng Việt, không ký hiệu viết tắt", () => {
  const root = path.resolve(import.meta.dirname, "../src");
  const files = [
    "features/statistics/StatisticsLayout.tsx",
    "features/statistics/ai-insights.ts",
    "features/statistics/statistics-view.ts",
    "components/charts/TrendPatternChart.tsx",
    "components/charts/CorrelationHeatmap.tsx",
    "components/charts/ClassificationPatternChart.tsx",
    "components/map/MapPopupCard.tsx",
    "components/map/MapControlsPanel.tsx",
    "layouts/navigation.ts",
  ];
  const banned = ["R²", "MAE", "RMSE", "t+1", "WGS84 ·", "Live", "↔", "≥ 6"];
  for (const file of files) {
    const source = readFileSync(path.resolve(root, file), "utf8");
    for (const token of banned) {
      assert.ok(!source.includes(token), `${file} không được chứa ký hiệu "${token}"`);
    }
  }
});

test("TC-21: Pattern 5 & 6 gộp chung, không còn aside", () => {
  const dir = path.resolve(import.meta.dirname, "../src/features/statistics/patterns");
  const merged = readFileSync(path.resolve(dir, "ForecastClassificationPatternPage.tsx"), "utf8");
  assert.match(merged, /ForecastPatternChart/u);
  assert.match(merged, /ClassificationPatternChart/u);
  assert.doesNotMatch(merged, /stat-layout__aside/u);

  for (const file of [
    "TemporalPatternPage.tsx",
    "TrendPatternPage.tsx",
    "SeasonalityPatternPage.tsx",
    "CorrelationPatternPage.tsx",
  ]) {
    const source = readFileSync(path.resolve(dir, file), "utf8");
    assert.doesNotMatch(source, /stat-layout__aside/u, `${file} không được dùng aside`);
  }
});

test("TC-14: route con dùng path tương đối — Outlet không bị trống", () => {
  const source = readFileSync(
    path.resolve(import.meta.dirname, "../src/features/statistics/StatisticsRoutes.tsx"),
    "utf8",
  );
  // StatisticsRoutes nằm dưới route cha `/statistics/*`: viết lại prefix ở đây sẽ làm
  // descendant <Routes> không khớp → vùng nội dung của sublayout trống.
  assert.match(source, /<Route\s+element=\{<StatisticsLayout\s*\/>\}>/u);
  assert.doesNotMatch(source, /path=\{APP_ROUTES\.STATISTICS\}/u);
  assert.match(source, /StatisticsLayout/u);
});

test("TC-13: patternPath & patternSlugFor khớp route con, fallback an toàn", () => {
  assert.equal(PATTERN_BASE_PATH, "/statistics");
  assert.equal(patternPath("xuan-huong"), "/statistics/xuan-huong");

  for (const item of PATTERN_NAV) {
    assert.equal(patternSlugFor(patternPath(item.slug)), item.slug);
    assert.equal(patternSlugFor(`${patternPath(item.slug)}/`), item.slug);
  }

  assert.equal(patternSlugFor("/statistics"), PATTERN_NAV[0].slug);
  assert.equal(patternSlugFor("/statistics/khong-ton-tai"), PATTERN_NAV[0].slug);
});
