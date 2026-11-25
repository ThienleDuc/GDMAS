/** Test offline cho các điểm còn thiếu theo docs trên trang Tổng quan (2026-11-23). */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { applySseLatestEvent, type LatestEventRow } from "../src/features/overview/overview-view.ts";

const src = resolve(import.meta.dirname, "../src");
const read = (path: string): string => readFileSync(resolve(src, path), "utf8");

const base: LatestEventRow[] = [
  { id: 1, time: "2026-11-23T01:00:00Z", place: "Honshu, Japan", magnitude: 4.2, latitude: 38, longitude: 142 },
];

test("TC-01: SSE sự kiện thật được đưa vào đầu bảng", () => {
  const rows = applySseLatestEvent(base, {
    event: "earthquake_detected",
    data: {
      id: 2,
      event_time: "2026-11-23T02:00:00Z",
      place: "Java, Indonesia",
      magnitude: 5.1,
      latitude: -7.5,
      longitude: 110,
    },
  });
  assert.equal(rows[0].id, 2);
  assert.equal(rows[0].time, "2026-11-23T02:00:00Z");
  assert.equal(rows.length, 2);
});

test("TC-02: SSE không hợp lệ / event khác → giữ nguyên", () => {
  assert.deepEqual(applySseLatestEvent(base, { event: "heartbeat", data: {} }), base);
  assert.deepEqual(applySseLatestEvent(base, null), base);
  assert.deepEqual(
    applySseLatestEvent(base, { event: "earthquake_alert", data: { id: "x", magnitude: "bad" } }),
    base,
  );
});

test("TC-03: error + database_cleared có wiring", () => {
  const page = read("features/overview/OverviewPage.tsx");
  assert.match(page, /useDatabaseResetFromEvent\(sse\?\.data \?\? null\)/u);
  assert.match(page, /dbReset\.isCleared/u);
  assert.match(page, /data\.error && !data\.loading/u);
  assert.match(page, /onClick=\{data\.refresh\}/u);
  const hook = read("features/overview/useOverviewData.ts");
  assert.match(hook, /refreshVersion/u);
});

test("TC-04: ranking click sang bản đồ; KPI cụm ghi rõ toàn cục", () => {
  const page = read("features/overview/OverviewPage.tsx");
  assert.match(page, /navigate\(pathWithSelection\(APP_ROUTES\.MONITORING/u);
  assert.match(page, /card\.key === "clusters" && isCountryMode/u);
});

test("TC-05: chart khớp dữ liệu thật", () => {
  const severity = read("components/charts/OverviewSeverityChart.tsx");
  assert.match(severity, /BarChart/u);
  assert.match(severity, /stackId="severity"/u);
  assert.doesNotMatch(severity, /PieChart/u);
  const seasonality = read("components/charts/OverviewSeasonalityChart.tsx");
  assert.match(seasonality, /Chu kỳ cao điểm/u);
  assert.doesNotMatch(seasonality, /khung giờ/u);
  const trend = read("components/charts/OverviewTrendChart.tsx");
  assert.doesNotMatch(trend, /14 ngày/u);
});

test("TC-06: biểu đồ chu kỳ có chú giải màu", () => {
  const chart = read("components/charts/OverviewSeasonalityChart.tsx");
  assert.match(chart, /ov-season-legend/u);
  assert.match(chart, /LEVEL_LABELS/u);
  assert.match(chart, /Mạnh/u);
  assert.match(chart, /Trung bình/u);
  assert.match(chart, /Nhẹ/u);
  assert.match(chart, /style=\{\{ fill: BAR_COLORS/u); // CSS var trong SVG chắc chắn áp dụng
  const css = read("features/overview/OverviewPage.css");
  assert.match(css, /\.ov-season-legend\s*\{/u);
});

test("TC-20: Dự báo ngày tiếp theo hiện ngay cả khi chọn Tất cả quốc gia", () => {
  const page = read("features/overview/OverviewPage.tsx");
  assert.match(page, /Dự báo ngày tiếp theo/u);
  assert.match(page, /formatDecimal3\(prediction\.predictedValue\)/u);
  assert.match(page, /riskBadgeClass\(prediction\.riskLabel\)/u);
  assert.doesNotMatch(page, /const forecast = useMemo/u);
  assert.doesNotMatch(page, /forecast\./u);
});
