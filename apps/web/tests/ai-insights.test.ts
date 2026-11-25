/**
 * Test offline cho bảng phân tích chuyên gia (quy tắc từ 6 pattern).
 * TC-16…TC-18 trong .agents/notes/testcase/2026-11-21-statistics-six-patterns-charts-thien.md
 */

import test from "node:test";
import assert from "node:assert/strict";
import { buildExpertReport, type ExpertInput } from "../src/features/statistics/ai-insights.ts";

const emptyInput: ExpertInput = {
  temporal: null,
  trend: null,
  seasonality: null,
  correlation: null,
  prediction: null,
  classification: null,
  observed: [],
};

test("TC-16: dữ liệu trống → 6 nhận xét info, không bịa số", () => {
  const report = buildExpertReport(emptyInput);
  assert.equal(report.insights.length, 6);
  assert.ok(report.insights.every((item) => item.level === "info"));
  assert.ok(report.insights.every((item) => item.comment.includes("Chưa có")));
  assert.match(report.headline, /chưa cho thấy tín hiệu bất thường/u);
  assert.match(report.dataSourceNote, /không phải cảnh báo chính thức/u);
});

test("TC-17: dữ liệu thật → nhận xét bám số liệu, phân loại mức đúng", () => {
  const input: ExpertInput = {
    temporal: {
      interval: "day",
      line_chart: [
        { date: "2026-11-20", event_count: 12, max_magnitude: 6.2 },
        { date: "2026-11-21", event_count: 18, max_magnitude: 5.1 },
      ],
      scatter_plot: [],
      histogram: { magnitude_bins: [] },
    },
    trend: {
      resample_freq: "W",
      metric: "count",
      series: [{ period: "2026-11", actual_value: 10, trend_value: 11 }],
      trend_direction: "increasing",
      r_squared: 0.72,
    },
    seasonality: {
      components: {
        seasonal_line: [{ cycle_index: 1, period_label: "Tháng 1", seasonal_factor: 1.2 }],
        seasonality_strength: 0.8,
      },
    },
    correlation: {
      variables: ["magnitude", "depth_km"],
      matrix: [
        [1, 0.82],
        [0.82, 1],
      ],
      method: "pearson",
    },
    prediction: {
      target_date: "2026-11-22",
      predicted_value: 50,
      confidence_interval: { lower: 40, upper: 60 },
    },
    classification: { target_date: "2026-11-22", predicted_label: "Critical" },
    observed: [{ label: "2026-11-21", value: 30 }],
  };

  const report = buildExpertReport(input);
  assert.match(report.headline, /Cần chú ý/u);
  assert.equal(report.insights.find((item) => item.id === "classification")?.level, "alert");
  assert.match(
    report.insights.find((item) => item.id === "classification")?.comment ?? "",
    /Rất cao/u,
  );
  assert.match(report.insights.find((item) => item.id === "forecast")?.comment ?? "", /50\.0/u);
  assert.match(report.insights.find((item) => item.id === "forecast")?.comment ?? "", /40\.0 – 60\.0/u);
  assert.match(report.insights.find((item) => item.id === "correlation")?.comment ?? "", /Độ lớn/u);
  assert.match(report.insights.find((item) => item.id === "correlation")?.comment ?? "", /không khẳng định nhân quả/u);
  assert.match(report.outlook, /Triển vọng ngày kế tiếp/u);
  assert.ok(report.summary.includes("6 nhóm phân tích"));
  assert.ok(report.insights.every((item) => item.evidence.length > 0));
  assert.ok(report.recommendations.length >= 2);
  assert.equal(report.caveats.length, 3);
});

test("TC-18: mức thấp → headline ổn định, forecast giữ alias phẳng", () => {
  const report = buildExpertReport({
    ...emptyInput,
    prediction: { target_date: "2026-11-22", predicted_value: 12, lower_bound: 10, upper_bound: 14 },
    classification: { target_date: "2026-11-22", predicted_label: "Low" },
  });
  assert.ok(!/Cần chú ý/u.test(report.headline));
  assert.match(
    report.insights.find((item) => item.id === "forecast")?.comment ?? "",
    /10\.0 – 14\.0/u,
  );
  assert.match(
    report.insights.find((item) => item.id === "classification")?.comment ?? "",
    /Thấp/u,
  );
});
