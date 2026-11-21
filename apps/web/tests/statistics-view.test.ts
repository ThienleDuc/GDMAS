/**
 * Test offline cho logic thuần trang "6 Patterns Phân tích" (T7.06–T7.09).
 * TC-01…TC-07 trong .agents/notes/testcase/2026-11-21-statistics-six-patterns-charts-thien.md
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  buildCorrelationCells,
  correlationColor,
  correlationVariableLabel,
  evaluationText,
  forecastMetricLabel,
  forecastRows,
  intervalToParams,
  metricsFor,
  NEXT_DAY_EXPLANATION,
  PATTERN_TITLES,
  statisticsView,
} from "../src/features/statistics/statistics-view.ts";
import {
  asClassification,
  asPrediction,
  buildForecastBand,
  buildRiskBars,
} from "../src/lib/transforms/chart-data.ts";

const NOW = new Date("2026-11-21T00:00:00Z");

test("TC-01: intervalToParams trả cửa sổ UTC Z đúng cho day/week/month", () => {
  const day = intervalToParams("day", NOW);
  assert.equal(day.start_time, "2026-11-20T00:00:00.000Z");
  assert.equal(day.end_time, "2026-11-21T00:00:00.000Z");
  assert.match(day.start_time, /Z$/);

  assert.equal(intervalToParams("week", NOW).start_time, "2026-11-14T00:00:00.000Z");
  assert.equal(intervalToParams("month", NOW).start_time, "2026-10-21T00:00:00.000Z");
});

test("TC-02: metricsFor xử lý empty envelope không throw", () => {
  assert.equal(metricsFor({ success: false, data: null, message: "rỗng" }), null);
  assert.equal(metricsFor(null), null);
  assert.equal(metricsFor(undefined), null);
  assert.deepEqual(metricsFor({ success: true, data: { interval: "day" } }), { interval: "day" });
});

test("TC-03: buildCorrelationCells giữ thứ tự biến, ô null → '—'", () => {
  const variables = ["magnitude", "depth_km", "latitude", "longitude", "daily_event_count"];
  const matrix = [
    [1, null, 0, 0, 0],
    [null, 1, 0, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 0, 1],
  ];
  const cells = buildCorrelationCells(variables, matrix);

  assert.equal(cells.length, 25);
  assert.equal(cells[0].value, 1);
  assert.equal(cells[1].label, "—");
  assert.equal(cells[1].x, "depth_km");
  assert.equal(cells[5].y, "depth_km");
  assert.ok(cells.every((cell) => cell.value === null || (cell.value >= -1 && cell.value <= 1)));
  assert.deepEqual(buildCorrelationCells(null, null), []);
});

test("TC-04: correlationColor 5 dải phân kỳ, null/NaN trung tính", () => {
  const colors = [-1, -0.5, 0, 0.5, 1].map((value) => correlationColor(value));
  assert.equal(new Set(colors).size, 5);
  assert.equal(correlationColor(null), "#64748b");
  assert.equal(correlationColor(Number.NaN), "#64748b");
});

test("TC-05: evaluationText thiếu mae/rmse thì báo rõ", () => {
  assert.equal(evaluationText(null), "chưa có dữ liệu kiểm định");
  assert.equal(evaluationText({}), "chưa có dữ liệu kiểm định");
  assert.equal(evaluationText({ mae: 0.12 }), "chưa có dữ liệu kiểm định");
  assert.match(evaluationText({ mae: 0.12, rmse: 0.34 }), /Sai số tuyệt đối trung bình 0\.120/u);
  assert.match(evaluationText({ mae: 0.12, rmse: 0.34 }), /Sai số căn quân phương 0\.340/u);
});

test("TC-06: forecastRows CI hợp lệ, thiếu predicted → []", () => {
  const observed = [{ label: "2026-11-20", value: 2 }];
  const rows = forecastRows(
    { target_date: "2026-11-22", predicted_value: 5, lower_bound: 3, upper_bound: 7 },
    observed,
  );
  assert.equal(rows.length, 2);
  const last = rows[rows.length - 1];
  assert.equal(last.predicted, 5);
  assert.ok((last.lower ?? 0) <= 5 && (last.upper ?? 0) >= 5);
  assert.equal(last.bridge, 5);
  assert.deepEqual(forecastRows({ predicted_value: null }, observed), []);
});

test("TC-11: tên 6 pattern theo tài liệu và nhãn tiếng Việt", () => {
  assert.deepEqual([...PATTERN_TITLES], [
    "Biểu diễn theo thời gian",
    "Phân tích xu hướng",
    "Phân tích chu kỳ",
    "Tương quan",
    "Hồi quy & Dự báo (ngày kế tiếp)",
    "Phân loại (ngày kế tiếp)",
  ]);
  assert.equal(correlationVariableLabel("depth_km"), "Độ sâu (km)");
  assert.equal(correlationVariableLabel("daily_event_count"), "Số sự kiện hằng ngày");
  assert.equal(forecastMetricLabel("event_count"), "Số sự kiện");
  assert.match(NEXT_DAY_EXPLANATION, /ngày kế tiếp/iu);
});

test("TC-10: adapter chuẩn hóa payload thật của /predictions và /classifications", () => {
  const examplesDir = path.resolve(import.meta.dirname, "../../../contracts/examples");
  const read = (name: string) =>
    JSON.parse(readFileSync(path.resolve(examplesDir, name), "utf8")) as {
      data: Record<string, unknown>;
    };

  // BE trả confidence_interval lồng nhau → phải map sang lower_bound/upper_bound.
  const prediction = asPrediction(read("predictions_sample.json").data);
  assert.equal(prediction.lower_bound, 38);
  assert.equal(prediction.upper_bound, 54.4);
  const rows = buildForecastBand([{ label: "2026-11-16", value: 40 }], prediction);
  assert.ok((rows[rows.length - 1].ciSpan ?? 0) > 0);

  // BE trả probabilities → phải map sang probability_scores cho buildRiskBars.
  const classification = asClassification(read("classifications_sample.json").data);
  assert.ok(classification.probability_scores);
  assert.equal(Object.keys(classification.probability_scores ?? {}).length, 4);
  assert.equal(buildRiskBars(classification.probability_scores).length, 4);
});

test("TC-07: statisticsView ưu tiên loading → error → empty → ready", () => {
  assert.equal(statisticsView({ loading: true, error: new Error("x"), hasData: true }), "loading");
  assert.equal(statisticsView({ loading: false, error: new Error("x"), hasData: true }), "error");
  assert.equal(statisticsView({ loading: false, error: null, hasData: false }), "empty");
  assert.equal(statisticsView({ loading: false, error: null, hasData: true }), "ready");
});
