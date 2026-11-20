import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  DEPTH_BANDS,
  MAGNITUDE_BANDS,
  SEVERITY_FOOTNOTE,
  mapRangeToInterval,
  parseNumericInput,
  stepValue,
} from "../src/features/earthquakes/earthquake-insights.ts";

test("TC-01: mapRangeToInterval theo preset Ngày/Tuần/Tháng", () => {
  assert.equal(mapRangeToInterval("day"), "day");
  assert.equal(mapRangeToInterval("week"), "week");
  assert.equal(mapRangeToInterval("month"), "month");
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
  assert.match(insights, /<MagnitudeHistogramChart/u);
  assert.match(insights, /selectedCountry|onCountryChange/u);
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
