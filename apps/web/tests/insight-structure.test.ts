/**
 * Kiểm chứng cấu trúc bảng phân tích khớp docs/analysis/insights-structure.md.
 * TC-19, TC-20 trong .agents/notes/testcase/2026-11-21-statistics-six-patterns-charts-thien.md
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { INSIGHT_SECTIONS, sectionTitle } from "../src/features/statistics/insight-structure.ts";
import { buildExpertReport } from "../src/features/statistics/ai-insights.ts";

const docPath = path.resolve(
  import.meta.dirname,
  "../../../docs/analysis/insights-structure.md",
);

test("TC-19: 5 phần báo cáo khớp tên trong tài liệu", () => {
  const doc = readFileSync(docPath, "utf8");
  assert.equal(INSIGHT_SECTIONS.length, 5);

  for (const section of INSIGHT_SECTIONS) {
    assert.ok(
      doc.includes(section.title),
      `"${section.title}" phải có trong docs/analysis/insights-structure.md`,
    );
  }
  assert.equal(sectionTitle("summary"), "Tổng quan");
  assert.equal(sectionTitle("outlook"), "Triển vọng ngày kế tiếp");
});

test("TC-20: báo cáo sinh ra đủ 5 phần và có evidence/khuyến nghị", () => {
  const report = buildExpertReport({
    temporal: {
      interval: "day",
      line_chart: [{ date: "2026-11-21", event_count: 8, max_magnitude: 6.1 }],
      scatter_plot: [],
      histogram: { magnitude_bins: [] },
    },
    trend: null,
    seasonality: null,
    correlation: null,
    prediction: { target_date: "2026-11-22", predicted_value: 20, lower_bound: 18, upper_bound: 23 },
    classification: { target_date: "2026-11-22", predicted_label: "High" },
    observed: [{ label: "2026-11-21", value: 12 }],
  });

  assert.ok(report.headline.length > 0);
  assert.ok(report.summary.includes("6 nhóm phân tích"));
  assert.equal(report.insights.length, 6);
  assert.ok(report.insights.every((item) => Array.isArray(item.evidence)));
  assert.ok(report.insights.find((item) => item.id === "temporal")?.evidence.length > 0);
  assert.ok(report.recommendations.length > 0);
  assert.equal(report.caveats.length, 3);
  assert.ok(report.outlook.includes("Triển vọng ngày kế tiếp"));
  assert.ok(report.dataSourceNote.includes("không phải cảnh báo chính thức"));
});
