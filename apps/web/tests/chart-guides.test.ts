/**
 * Test offline cho nhãn chu kỳ lấy mẫu và hướng dẫn đọc biểu đồ.
 * TC-24, TC-25 trong .agents/notes/testcase/2026-11-21-statistics-six-patterns-charts-thien.md
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  CHART_GUIDES,
  GUIDE_HIGHLIGHTS,
  resampleFreqLabel,
  RMSE_EXPLANATION,
} from "../src/components/charts/chart-guides.ts";

test("TC-24: chu kỳ M/W/D được ghi rõ thành Tháng/Tuần/Ngày", () => {
  assert.equal(resampleFreqLabel("M"), "Tháng");
  assert.equal(resampleFreqLabel("W"), "Tuần");
  assert.equal(resampleFreqLabel("D"), "Ngày");
  assert.equal(resampleFreqLabel(null), "Chưa xác định");
  assert.equal(resampleFreqLabel("X"), "X");
});

test("TC-25: 6 pattern đều có hướng dẫn đọc, RMSE được giải thích dễ hiểu", () => {
  assert.deepEqual(Object.keys(CHART_GUIDES), [
    "temporal",
    "trend",
    "seasonality",
    "correlation",
    "forecast",
    "classification",
  ]);
  for (const lines of Object.values(CHART_GUIDES)) {
    assert.ok(lines.length >= 3);
    assert.ok(lines.every((line) => line.length > 10));
  }
  assert.match(RMSE_EXPLANATION, /bình phương/u);
  assert.match(RMSE_EXPLANATION, /càng nhỏ thì dự báo càng sát/u);
  assert.match(RMSE_EXPLANATION, /phạt nặng/u);
  assert.ok(CHART_GUIDES.forecast.some((line) => line.includes("Sai số căn quân phương")));
  assert.ok(GUIDE_HIGHLIGHTS.forecast.some((item) => item.term === "Sai số căn quân phương"));
});

test("TC-28: hướng dẫn dùng viền mỏng bao quanh, không viền trái đậm", () => {
  const root = path.resolve(import.meta.dirname, "../");
  const css = readFileSync(
    path.resolve(root, "src/features/statistics/StatisticsPage.css"),
    "utf8",
  );
  const sideRule = css.match(/\.stat-reading-guide--side\s*\{[^}]*\}/u)?.[0] ?? "";
  assert.doesNotMatch(sideRule, /border-left/u);
  assert.match(sideRule, /border:\s*var\(--border-width-thin\)/u);
  const globals = readFileSync(path.resolve(root, "src/styles/globals.css"), "utf8");
  assert.match(globals, /--border-width-thin:\s*1px/u);
});

test("TC-27: màu highlight pastel là token dùng chung trong globals.css", () => {
  const root = path.resolve(import.meta.dirname, "../");
  const globals = readFileSync(path.resolve(root, "src/styles/globals.css"), "utf8");
  const componentCss = readFileSync(
    path.resolve(root, "src/features/statistics/StatisticsPage.css"),
    "utf8",
  );

  for (const tone of ["blue", "orange", "red"]) {
    assert.match(globals, new RegExp(`--highlight-${tone}-bg:`, "u"));
    assert.match(globals, new RegExp(`--highlight-${tone}-fg:`, "u"));
    assert.match(componentCss, new RegExp(`background:\\s*var\\(--highlight-${tone}-bg\\)`, "u"));
    assert.match(componentCss, new RegExp(`color:\\s*var\\(--highlight-${tone}-fg\\)`, "u"));
  }
  assert.doesNotMatch(componentCss, /#dbeafe|#ffedd5|#ffe4e6/u);
});

test("TC-26: hướng dẫn nằm bên phải biểu đồ, có từ khóa tô màu", () => {
  const dir = path.resolve(import.meta.dirname, "../src/components/charts");
  const charts = [
    "TemporalPatternCharts.tsx",
    "TrendPatternChart.tsx",
    "SeasonalityPatternChart.tsx",
    "CorrelationHeatmap.tsx",
    "ForecastPatternChart.tsx",
    "ClassificationPatternChart.tsx",
  ];
  for (const file of charts) {
    const source = readFileSync(path.resolve(dir, file), "utf8");
    assert.match(source, /stat-chart-row/u, `${file} cần bố cục 2 cột`);
    assert.match(source, /<ChartReadingGuide pattern=/u, `${file} cần hướng dẫn đọc`);
    assert.match(source, /stat-chart-row__main/u, `${file} cần cột nội dung riêng`);
  }
  const guide = readFileSync(path.resolve(dir, "ChartReadingGuide.tsx"), "utf8");
  assert.match(guide, /stat-reading-guide--side/u);
  assert.match(guide, /stat-reading-guide__hl--/u);
});
