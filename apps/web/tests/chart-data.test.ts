/**
 * Unit test offline cho lớp biến đổi dữ liệu 6 Patterns (`chart-data.ts`).
 * Testcase: .agents/notes/testcase/2026-11-16-six-patterns-chart-components-thien.md
 *
 * Chạy: cd apps/web && pnpm test   (tương đương: node --test tests/*.test.ts)
 * Không gọi mạng, không DB, không `fetch`/`EventSource` (I7).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  buildForecastBand,
  buildHistogramBins,
  buildLineSeriesFromScatter,
  buildRiskBars,
  buildSeasonalSeries,
  buildTrendSeries,
  bucketKeyUtc,
  formatCoefficient,
  formatNumber,
  formatPercent,
  isFiniteNumber,
  normalizeRiskLabel,
  resolvePatternView,
  startOfIsoWeekUtc,
  toObservedFromLineChart,
  toObservedFromTrend,
} from "../src/lib/transforms/chart-data.ts";

const samplePath = path.resolve(
  import.meta.dirname,
  "../../../contracts/examples/patterns_sample.json",
);
const sample = JSON.parse(readFileSync(samplePath, "utf8"));

const patternOf = (id) => sample.patterns.find((pattern) => pattern.id === id);

test("TC-01 hợp đồng mẫu đọc được và đúng shape tối thiểu", () => {
  assert.equal(sample.success, true);
  assert.equal(sample.total_patterns, 6);
  assert.deepEqual(
    sample.patterns.map((pattern) => pattern.id),
    ["pattern_1", "pattern_2", "pattern_3", "pattern_4", "pattern_5", "pattern_6"],
  );

  for (const pattern of sample.patterns) {
    assert.ok(["COMPUTED", "PENDING"].includes(pattern.status));
    assert.equal(typeof pattern.metrics, "object");
    assert.equal(typeof pattern.period, "string");
  }

  const timestamps = patternOf("pattern_1").metrics.scatter_plot.map((point) => point.timestamp);
  assert.ok(timestamps.length > 0);
  for (const timestamp of timestamps) {
    assert.match(timestamp, /Z$/);
    assert.ok(!Number.isNaN(new Date(timestamp).getTime()));
  }

  // WGS84: 2 biến tọa độ bắt buộc phải có trong ma trận tương quan Pattern 4.
  const variables = patternOf("pattern_4").metrics.variables;
  assert.ok(variables.includes("latitude"));
  assert.ok(variables.includes("longitude"));
});

test("TC-02 gom nhóm theo ngày dùng UTC, không dùng giờ local", () => {
  assert.equal(bucketKeyUtc("2026-11-01T00:00:00Z", "day"), "2026-11-01");
  assert.equal(bucketKeyUtc("2026-11-01T23:59:59Z", "day"), "2026-11-01");
  assert.equal(bucketKeyUtc("2026-11-01T00:00:00+07:00", "day"), "2026-10-31");
  assert.equal(bucketKeyUtc("not-a-date", "day"), null);
  assert.equal(bucketKeyUtc(null, "day"), null);
});

test("TC-03 gom nhóm tuần bắt đầu Thứ 2 (UTC) và tháng", () => {
  // 2026-11-01 là Chủ nhật → tuần bắt đầu 2026-10-26.
  assert.equal(bucketKeyUtc("2026-11-01T10:00:00Z", "week"), "2026-10-26");
  assert.equal(bucketKeyUtc("2026-11-02T10:00:00Z", "week"), "2026-11-02");
  assert.equal(bucketKeyUtc("2026-11-30T23:00:00Z", "week"), "2026-11-30");
  assert.equal(bucketKeyUtc("2026-11-30T23:00:00Z", "month"), "2026-11");
  assert.equal(
    startOfIsoWeekUtc(new Date(Date.UTC(2026, 10, 1))).toISOString().slice(0, 10),
    "2026-10-26",
  );
});

test("TC-04 line series từ scatter: đếm, trung bình, max, sắp xếp", () => {
  const series = buildLineSeriesFromScatter(
    [
      { timestamp: "2026-11-02T01:00:00Z", magnitude: 4.0, depth_km: 10 },
      { timestamp: "2026-11-01T05:00:00Z", magnitude: 3.0, depth_km: 20 },
      { timestamp: "2026-11-02T02:00:00Z", magnitude: 6.0, depth_km: 30 },
      { timestamp: "2026-11-01T06:00:00Z", magnitude: 5.0, depth_km: 40 },
      { timestamp: "invalid", magnitude: 9.9, depth_km: 1 },
    ],
    "day",
  );

  assert.deepEqual(series, [
    { date: "2026-11-01", event_count: 2, avg_magnitude: 4, max_magnitude: 5 },
    { date: "2026-11-02", event_count: 2, avg_magnitude: 5, max_magnitude: 6 },
  ]);
  assert.deepEqual(buildLineSeriesFromScatter(null, "week"), []);
});

test("TC-05 histogram bins: giữ thứ tự, bỏ bin lỗi, kẹp count âm", () => {
  const bins = buildHistogramBins(patternOf("pattern_1").metrics.histogram.magnitude_bins);
  assert.equal(bins.length, 5);
  assert.equal(bins[0].bin, "< 2.0");
  assert.equal(
    bins.reduce((sum, bin) => sum + bin.count, 0),
    128,
  );

  assert.deepEqual(buildHistogramBins(undefined), []);
  assert.deepEqual(
    buildHistogramBins([{ bin: "x", count: -4 }, { bin: 5, count: 2 }]),
    [{ bin: "x", count: 0 }],
  );
});

test("TC-06 trend giữ null, seasonality lọc giá trị không hữu hạn", () => {
  const trend = buildTrendSeries([
    { period: "2026-10", actual_value: 10, trend_value: null, is_complete: true },
    { period: "2026-11", actual_value: 12, trend_value: 11.5, is_complete: false },
    { period: "", actual_value: 99 },
    { period: "2026-09", actual_value: Number.NaN },
  ]);
  assert.deepEqual(trend, [
    { period: "2026-10", actual_value: 10, trend_value: null, is_complete: true },
    { period: "2026-11", actual_value: 12, trend_value: 11.5, is_complete: false },
  ]);

  const seasonal = buildSeasonalSeries(patternOf("pattern_3").metrics.components);
  assert.equal(seasonal.length, 12);
  assert.equal(seasonal[0].period_label, "Tháng 1");

  assert.deepEqual(buildSeasonalSeries({ seasonal_line: [] }), []);
  assert.deepEqual(buildSeasonalSeries(undefined), []);
});

test("TC-07 dải tin cậy dự báo: history + forecast + bridge", () => {
  // BUG-thien-001 (fixed): band phải bao trùm cả predicted_value khi BE trả biên hoán vị
  // (`lower_bound` > `predicted_value`), nếu không ciBase/ciSpan sẽ cắt cụt dải tin cậy.
  const observed = [
    { label: "2026-11-10", value: 25 },
    { label: "2026-11-11", value: 21 },
  ];
  const band = buildForecastBand(observed, {
    predicted_value: 46.2,
    lower_bound: 38.0,
    upper_bound: 54.4,
    target_date: "2026-11-12",
  });

  assert.equal(band.length, 3);
  assert.deepEqual(band[0], {
    label: "2026-11-10",
    observed: 25,
    predicted: null,
    lower: 25,
    upper: 25,
    ciBase: null,
    ciSpan: null,
    bridge: null,
  });
  assert.equal(band[1].bridge, 21);
  assert.deepEqual(band[2], {
    label: "2026-11-12",
    observed: null,
    predicted: 46.2,
    lower: 38,
    upper: 54.4,
    ciBase: 38,
    ciSpan: 16.4,
    bridge: 46.2,
  });

  assert.deepEqual(buildForecastBand(observed, { predicted_value: null }), []);

  const swapped = buildForecastBand([], {
    predicted_value: 10,
    lower_bound: 12,
    upper_bound: 8,
  });
  assert.equal(swapped[0].lower, 8);
  assert.equal(swapped[0].upper, 12);
  assert.equal(swapped[0].ciBase, 8);

  // BUG-thien-001: chỉ biên trên nằm dưới điểm dự báo → band vẫn phải phủ tới predicted.
  const upperBelow = buildForecastBand([], {
    predicted_value: 20,
    lower_bound: 10,
    upper_bound: 15,
  });
  assert.equal(upperBelow[0].lower, 10);
  assert.equal(upperBelow[0].upper, 20);
  assert.equal(upperBelow[0].ciBase, 10);
  assert.equal(upperBelow[0].ciSpan, 10);

  // Biên thiếu → dùng chính predicted, band suy biến (không âm).
  const missingBounds = buildForecastBand([], { predicted_value: 7 });
  assert.equal(missingBounds[0].lower, 7);
  assert.equal(missingBounds[0].upper, 7);
  assert.equal(missingBounds[0].ciSpan, 0);
});

test("TC-08 nhãn & xác suất rủi ro được chuẩn hóa", () => {
  assert.equal(normalizeRiskLabel("Normal Activity"), "MEDIUM");
  assert.equal(normalizeRiskLabel("CRITICAL"), "CRITICAL");
  assert.equal(normalizeRiskLabel("critical_activity"), "CRITICAL");
  assert.equal(normalizeRiskLabel("không rõ"), null);
  assert.equal(normalizeRiskLabel(42), null);

  const bars = buildRiskBars({
    LOW: 0.15,
    "Normal Activity": 0.65,
    HIGH: 0.15,
    CRITICAL: 0.05,
    unknown: 0.2,
    negative: -1,
  });
  assert.deepEqual(
    bars.map((bar) => bar.level),
    ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
  );
  assert.ok(Math.abs(bars.reduce((sum, bar) => sum + bar.probability, 0) - 1) < 1e-6);
  assert.equal(bars[1].probability, 0.65);

  const percentage = buildRiskBars({ LOW: 15, MEDIUM: 65, HIGH: 15, CRITICAL: 5 });
  assert.equal(percentage[1].probability, 0.65);
  assert.ok(Math.abs(percentage.reduce((sum, bar) => sum + bar.probability, 0) - 1) < 1e-6);

  assert.deepEqual(buildRiskBars(null), []);
  assert.deepEqual(buildRiskBars({}), []);
  assert.equal(
    buildRiskBars({ LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 }).every(
      (bar) => bar.probability === 0,
    ),
    true,
  );
});

test("TC-09 Empty State: PENDING / thiếu bản ghi / insufficient_data", () => {
  assert.equal(resolvePatternView(undefined).available, false);
  assert.match(resolvePatternView(undefined).reason, /Chưa có bản ghi/);

  assert.equal(resolvePatternView({ status: "PENDING", metrics: {} }).available, false);
  assert.match(resolvePatternView({ status: "PENDING", metrics: {} }).reason, /PENDING/);

  const insufficient = resolvePatternView({
    status: "COMPUTED",
    metrics: {
      status: "insufficient_data",
      components: { interpretation: "Chưa đủ dữ liệu chu kỳ" },
    },
  });
  assert.equal(insufficient.available, false);
  assert.equal(insufficient.reason, "Chưa đủ dữ liệu chu kỳ");

  const computed = resolvePatternView({
    status: "COMPUTED",
    metrics: { status: "computed", line_chart: [] },
  });
  assert.equal(computed.available, true);

  const nullMetrics = resolvePatternView({ status: "COMPUTED", metrics: null });
  assert.equal(nullMetrics.available, true);
  assert.deepEqual(nullMetrics.metrics, {});
});

test("TC-10 format số không bịa giá trị dự phòng", () => {
  assert.equal(formatNumber(null), "—");
  assert.equal(formatNumber(undefined), "—");
  assert.equal(formatNumber(Number.NaN), "—");
  assert.equal(formatNumber(Number.POSITIVE_INFINITY), "—");
  assert.equal(formatNumber(0, 2), "0.00");
  assert.equal(formatNumber(3.14159, 2), "3.14");
  assert.equal(formatNumber(24.5, 1, " km"), "24.5 km");

  assert.equal(formatCoefficient(0.12345), "0.1235");
  assert.equal(formatCoefficient(-0.15), "-0.1500");
  assert.equal(formatCoefficient(null), "—");

  assert.equal(formatPercent(0.35, 1), "35.0%");
  assert.equal(formatPercent(null), "—");
});

test("TC-11 chịu được kiểu dữ liệu sai", () => {
  assert.equal(isFiniteNumber(0), true);
  assert.equal(isFiniteNumber("5.2"), false);
  assert.equal(isFiniteNumber({}), false);
  assert.equal(isFiniteNumber([]), false);
  assert.equal(formatNumber("5.2"), "—");
  assert.deepEqual(buildLineSeriesFromScatter([{ timestamp: null, magnitude: 1, depth_km: 1 }], "day"), []);
});

test("TC-12 lịch sử quan sát cho biểu đồ dự báo", () => {
  const fromTrend = toObservedFromTrend(patternOf("pattern_2").metrics.series);
  assert.equal(fromTrend.length, 6);
  assert.equal(fromTrend[0].label, "2026-06");

  const fromLine = toObservedFromLineChart(patternOf("pattern_1").metrics.line_chart, 3);
  assert.equal(fromLine.length, 3);
  assert.equal(fromLine[2].value, 21);

  assert.deepEqual(toObservedFromTrend(undefined), []);
  assert.deepEqual(toObservedFromLineChart(undefined), []);
});
