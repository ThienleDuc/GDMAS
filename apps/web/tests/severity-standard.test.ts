/**
 * Test offline — chuẩn hóa quy ước độ lớn/độ sâu/màu giữa Overview và Danh mục động đất.
 * testcase: 2026-11-23-overview-severity-standard-thien. Không render DOM, không mạng (I7).
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  DEPTH_BANDS,
  MAGNITUDE_BANDS,
  SEVERITY_FOOTNOTE,
} from "../src/features/earthquakes/earthquake-insights.ts";
import { depthLabel, riskBadgeClass, severityLabel } from "../src/features/overview/overview-view.ts";

const root = resolve(import.meta.dirname, "../src");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");

test("TC-01: nhãn Overview lấy trực tiếp từ MAGNITUDE_BANDS", () => {
  assert.deepEqual(
    MAGNITUDE_BANDS.map((band) => band.level),
    ["Rất nhẹ", "Nhẹ", "Trung bình", "Mạnh", "Rất mạnh"],
  );
  const magnitudes = [2.9, 3.5, 5.5, 6.5, 7.5];
  magnitudes.forEach((value, index) => {
    const label = severityLabel(value);
    assert.equal(label.label, MAGNITUDE_BANDS[index].level);
    assert.equal(label.badgeClass, MAGNITUDE_BANDS[index].badgeClass);
  });
});

test("TC-02: nhãn độ sâu lấy trực tiếp từ DEPTH_BANDS", () => {
  assert.deepEqual(
    DEPTH_BANDS.map((band) => band.level),
    ["Nông", "Trung bình", "Sâu"],
  );
  const depths = [10, 100, 400];
  depths.forEach((value, index) => {
    const label = depthLabel(value);
    assert.equal(label.label, DEPTH_BANDS[index].level);
    assert.equal(label.badgeClass, DEPTH_BANDS[index].badgeClass);
  });
});

test("TC-03: Overview import bands — không nhân bản bảng quy ước", () => {
  const view = read("features/overview/overview-view.ts");
  assert.match(view, /DEPTH_BANDS/u);
  assert.match(view, /MAGNITUDE_BANDS/u);
  assert.match(view, /SEVERITY_FOOTNOTE/u);
  assert.doesNotMatch(view, /const MAGNITUDE_BANDS/u);
  assert.doesNotMatch(view, /const DEPTH_BANDS/u);
  assert.match(read("features/overview/OverviewPage.tsx"), /SEVERITY_FOOTNOTE/u);
  assert.match(SEVERITY_FOOTNOTE, /tham khảo/u);
});

test("TC-05: màu chart khớp token badge earthquakes", () => {
  const chart = read("components/charts/OverviewSeverityChart.tsx");
  assert.match(chart, /minor:\s*"var\(--chart-3\)"/u);
  assert.match(chart, /moderate:\s*"var\(--chart-4\)"/u);
  assert.match(chart, /strong:\s*"var\(--destructive\)"/u);
  const css = read("features/overview/OverviewPage.css");
  assert.match(css, /var\(--error-dark\)/u);
  assert.match(css, /var\(--warning-dark\)/u);
  assert.match(css, /var\(--info-dark\)/u);
  assert.match(css, /var\(--success-dark\)/u);
});

test("TC-06: cả 2 bảng Overview dùng ds-badge + cột độ sâu", () => {
  const page = read("features/overview/OverviewPage.tsx");
  const hotspots = read("components/charts/OverviewHotspotsChart.tsx");
  assert.match(page, /ds-badge \$\{severity\.badgeClass\}/u);
  assert.match(hotspots, /ds-badge \$\{severityLabel\(row\.maxMagnitude\)\.badgeClass\}/u);
  assert.match(page, /<th>Độ sâu<\/th>/u);
  assert.match(page, /depthLabel\(event\.depth_km\)/u);
  assert.doesNotMatch(page, /ov-severity--\$\{/u);
  assert.doesNotMatch(hotspots, /ov-severity--\$\{/u);
});

test("TC-07: chu kỳ và rủi ro cùng dùng palette earthquakes", () => {
  const seasonality = read("components/charts/OverviewSeasonalityChart.tsx");
  assert.match(seasonality, /above:\s*"var\(--destructive\)"/u);
  assert.match(seasonality, /average:\s*"var\(--chart-4\)"/u);
  assert.match(seasonality, /below:\s*"var\(--chart-3\)"/u);
  assert.match(seasonality, /above:\s*"Mạnh"/u);
  assert.match(seasonality, /below:\s*"Nhẹ"/u);
  assert.equal(riskBadgeClass("Trung bình"), "ds-badge-warning");
  assert.equal(riskBadgeClass("Cao"), "ds-badge-error");
  const page = read("features/overview/OverviewPage.tsx");
  assert.match(page, /riskBadgeClass/u);
  // Một kiểu duy nhất cho mọi label card — không còn card-title/ov-card__title trên Overview.
  assert.equal((page.match(/ov-card__label/gu) ?? []).length, 4);
  assert.doesNotMatch(page, /className="card-title"/u);
  assert.doesNotMatch(page, /ov-card__title/u);
  const labelCss = read("features/overview/OverviewPage.css");
  assert.match(labelCss, /\.ov-card__label\s*\{[^}]*font-size:\s*var\(--text-base\)/u);
  assert.match(labelCss, /\.ov-card__label\s*\{[^}]*font-weight:\s*var\(--font-bold\)/u);
  assert.match(labelCss, /\.ov-card__label\s*\{[^}]*color:\s*var\(--foreground\)/u);
});
