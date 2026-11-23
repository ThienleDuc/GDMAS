/** Test offline cho bộ lọc Ngày/Tuần/Tháng áp toàn biểu đồ Overview (2026-11-23). */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  getClustersOptional,
  getEarthquakeStatistics,
  getTrendAnalysis,
} from "../src/services/earthquake-api.ts";

const src = resolve(import.meta.dirname, "../src");
const read = (path: string): string => readFileSync(resolve(src, path), "utf8");

function captureUrls(): { urls: string[]; restore: () => void } {
  const urls: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL) => {
    urls.push(String(input));
    return new Response(
      JSON.stringify({ success: true, data: { total_events: 0 } }),
      { status: 200 },
    );
  };
  return { urls, restore: () => { globalThis.fetch = originalFetch; } };
}

test("TC-01: service forward cửa sổ tới statistics & trend", async () => {
  const window = {
    start_time: "2026-11-01T00:00:00.000Z",
    end_time: "2026-11-23T00:00:00.000Z",
  };
  const { urls, restore } = captureUrls();
  try {
    await getEarthquakeStatistics(undefined, { country: "Japan" }, window);
    await getTrendAnalysis({ resample_freq: "D", ...window });
  } finally {
    restore();
  }
  for (const url of urls) {
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get("start_time"), window.start_time);
    assert.equal(parsed.searchParams.get("end_time"), window.end_time);
  }
});

test("TC-02: Overview có bộ lọc 3 mục lưu trên ?range=", () => {
  const page = read("features/overview/OverviewPage.tsx");
  assert.match(page, /RANGE_PRESETS\.map/u);
  assert.match(page, /resolveWindow\(range\)/u);
  assert.match(page, /next\.set\("range", value\)/u);
  assert.match(page, /useOverviewData\(\{ country, region \}, dbReset\.refreshVersion, window\)/u);
});

test("TC-05: KPI cụm lọc theo quốc gia", async () => {
  const { urls, restore } = captureUrls();
  try {
    await getClustersOptional(undefined, { country: "Japan", region: "Honshu" });
  } finally {
    restore();
  }
  const url = new URL(urls[0]);
  assert.equal(url.pathname, "/api/v1/clusters");
  assert.equal(url.searchParams.get("country"), "Japan");
  assert.equal(url.searchParams.get("region"), "Honshu");
});

test("TC-04: Hotspots xếp 2 hàng dọc trong cột span 6", () => {
  const page = read("features/overview/OverviewPage.tsx");
  assert.match(page, /ov-card ov-card--6/u);
  assert.doesNotMatch(page, /ov-card--wide/u);
  const css = read("features/overview/OverviewPage.css");
  assert.match(css, /\.ov-chart-row\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/su);
  assert.match(css, /\.ov-chart-row \.ov-chart\s*\{[^}]*min-height:/su);
  assert.match(css, /\.ov-chart-row \.ov-chart \.recharts-responsive-container\s*\{[^}]*flex:/su);
  const chart = read("components/charts/OverviewHotspotsChart.tsx");
  assert.match(chart, /<div className="ov-chart-row">/u);
});

test("TC-03: 1 biểu đồ chu kỳ tuần, đổi range thì refetch", () => {
  const page = read("features/overview/OverviewPage.tsx");
  assert.equal((page.match(/<OverviewSeasonalityChart/gu) ?? []).length, 1);
  assert.match(page, /Chu kỳ hoạt động · 7 ngày/u);
  assert.doesNotMatch(page, /Cao điểm theo tháng/u);
  const hook = read("features/overview/useOverviewData.ts");
  assert.match(hook, /getSeasonalityAnalysis\(\{ \.\.\.geoQuery\(filter\), \.\.\.window \}/u);
  assert.doesNotMatch(hook, /getMonthlyPeaks/u);
});
