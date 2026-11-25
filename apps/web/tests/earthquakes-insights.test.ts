import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import type { EarthquakeItem } from "../src/contracts/earthquake.ts";
import {
  DEPTH_BANDS,
  MAGNITUDE_BANDS,
  SEVERITY_FOOTNOTE,
  buildCatalogStatistics,
  mapRangeToInterval,
  parseNumericInput,
  stepValue,
} from "../src/features/earthquakes/earthquake-insights.ts";

function item(id: number, magnitude: number, hoursAgo = 1): EarthquakeItem {
  return {
    id,
    source: "USGS",
    source_event_id: `mock_${id}`,
    event_time: new Date(Date.parse("2026-11-23T12:00:00Z") - hoursAgo * 3_600_000).toISOString(),
    latitude: 38.2,
    longitude: 142.4,
    depth_km: 10,
    magnitude,
    place: "Japan",
  };
}

test("TC-01: mapRangeToInterval theo preset Ngày/Tuần/Tháng", () => {
  assert.equal(mapRangeToInterval("day"), "day");
  assert.equal(mapRangeToInterval("week"), "week");
  assert.equal(mapRangeToInterval("month"), "month");
});

test("TC-09: buildCatalogStatistics tính KPI từ tập đã lọc (không lấy /statistics)", () => {
  const now = new Date("2026-11-23T12:00:00Z");
  const items = [item(1, 5, 1), item(2, 6, 2), item(3, 7, 30)];
  const stats = buildCatalogStatistics(items, 42, now).data;

  assert.equal(stats.total_events, 42, "Tổng số trận lấy từ metadata.total đã lọc");
  assert.equal(stats.recent_24h_count, 2, "Chỉ đếm sự kiện trong 24 giờ");
  assert.equal(stats.avg_magnitude, 6);
  assert.equal(stats.max_magnitude, 7);
  assert.equal(stats.strong_events_count, 2);

  const empty = buildCatalogStatistics([], 0, now).data;
  assert.equal(empty.total_events, 0);
  assert.equal(empty.recent_24h_count, 0);
  assert.equal(empty.avg_magnitude, 0);
  assert.equal(empty.max_magnitude, 0);
});

test("TC-02: parseNumericInput chỉ trả số hữu hạn", () => {
  assert.equal(parseNumericInput("4.5"), 4.5);
  assert.equal(parseNumericInput(" 10 "), 10);
  assert.equal(parseNumericInput(""), null);
  assert.equal(parseNumericInput("abc"), null);
  assert.equal(parseNumericInput("NaN"), null);
});

test("TC-03: stepValue tăng/giảm và clamp min/max, không NaN", () => {
  assert.equal(stepValue("4.5", 1, 0.5, 0, 10), "5");
  assert.equal(stepValue("4.5", -1, 0.5, 0, 10), "4");
  assert.equal(stepValue("0", -1, 0.5, 0, 10), "0");
  assert.equal(stepValue("9.8", 1, 0.5, 0, 10), "10");
  assert.equal(stepValue("abc", 1, 0.5, 0, 10), "0.5");
  assert.equal(stepValue("", -1, 5, 0), "0");
});

test("TC-04: severity bands có magnitude/depth/mức độ/diễn giải và footnote", () => {
  assert.ok(MAGNITUDE_BANDS.length >= 4);
  assert.ok(DEPTH_BANDS.length >= 3);
  for (const band of [...MAGNITUDE_BANDS, ...DEPTH_BANDS]) {
    assert.ok(band.range);
    assert.ok(band.level);
    assert.ok(band.description);
    assert.match(band.badgeClass, /^ds-badge-/u);
  }
  assert.match(SEVERITY_FOOTNOTE, /tham khảo/u);
  assert.match(SEVERITY_FOOTNOTE, /không phải/u);
});

test("TC-05: page compose histogram độ lớn, KPI 2×2 và ghi chú inline", () => {
  const sourceRoot = resolve(import.meta.dirname, "../src");
  const page = readFileSync(resolve(sourceRoot, "features/earthquakes/EarthquakesPage.tsx"), "utf8");
  const filter = readFileSync(resolve(sourceRoot, "features/earthquakes/components/EarthquakeFilterBar.tsx"), "utf8");
  const insights = readFileSync(resolve(sourceRoot, "features/earthquakes/components/EarthquakeInsights.tsx"), "utf8");
  const css = readFileSync(resolve(sourceRoot, "features/earthquakes/EarthquakesPage.css"), "utf8");
  assert.match(page, /CHART_PAGE_SIZE/u);
  assert.match(page, /chartFiltered/u);
  assert.match(css, /\.eq-severity-inline\s*\{[^}]*position:\s*sticky/su);
  assert.match(css, /\.eq-severity-inline\s*\{[^}]*height:\s*fit-content/su);
  assert.match(page, /<EarthquakeInsights/u);
  assert.match(page, /<SeverityReferenceTable/u);
  assert.match(page, /eq-data-row/u);
  const histogram = readFileSync(
    resolve(sourceRoot, "features/earthquakes/components/MagnitudeHistogramChart.tsx"),
    "utf8",
  );
  assert.match(insights, /<MagnitudeHistogramChart/u);
  assert.match(insights, /selectedCountry|onCountryChange/u);
  assert.match(histogram, /eq-country-chart__context/u);
  assert.doesNotMatch(histogram, /aria-label="Lọc theo quốc gia"/u);
  assert.doesNotMatch(histogram, /aria-label="Lọc theo khu vực"/u);
  assert.doesNotMatch(insights, /CountryClusterChart|HistogramMini|LineMini|ScatterMini/u);
  assert.doesNotMatch(insights, /Magnitude TB|Magnitude lớn nhất/u);
  assert.match(css, /\.eq-overview__kpis\s*\{[^}]*repeat\(2,/su);
  assert.match(css, /\.eq-data-row\s*\{/u);
  assert.doesNotMatch(css, /eq-insights__charts|eq-mini-chart/u);
  assert.match(filter, /NumberStepperField/u);
  assert.match(filter, /eq-filter-apply/u);
  assert.match(filter, /<svg[\s\S]*?viewBox/u);
  assert.match(filter, /onApply/u);
  assert.match(page, /handleApplyFilters/u);
  assert.match(page, /appliedForm/u);
  assert.doesNotMatch(filter, /<input\b(?![\s\S]*eq-stepper__input)/u);
});
