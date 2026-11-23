/**
 * Test offline cho luồng lọc biểu đồ theo quốc gia/khu vực (testcase 2026-11-23).
 * Không gọi mạng: fetch được giả bằng Response, phần còn lại là hàm thuần/source.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { geoQuery } from "../src/contracts/geo-filter.ts";
import {
  getClassifications,
  getEarthquakeStatistics,
  getPredictions,
  getSeasonalityAnalysis,
  getTemporalAnalysis,
  getTrendAnalysis,
} from "../src/services/earthquake-api.ts";

const src = resolve(import.meta.dirname, "../src");
const read = (relative: string): string => readFileSync(resolve(src, relative), "utf8");

function captureUrls(payload: unknown): { urls: string[]; restore: () => void } {
  const urls: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL) => {
    urls.push(String(input));
    return new Response(JSON.stringify(payload), { status: 200 });
  };
  return {
    urls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

const EMPTY = { success: true, data: {}, metadata: { total: 0, page: 1, limit: 1, total_pages: 0 } };

test("TC-01: geoQuery bỏ sentinel all", () => {
  assert.deepEqual(geoQuery({ country: "all", region: "all" }), {});
  assert.deepEqual(geoQuery({ country: "Japan", region: "Honshu" }), {
    country: "Japan",
    region: "Honshu",
  });
  assert.deepEqual(geoQuery(null), {});
});

test("TC-02: service forward country/region tới route aggregate", async () => {
  const { urls, restore } = captureUrls(EMPTY);
  try {
    await getEarthquakeStatistics(undefined, { country: "Japan", region: "Honshu" });
    await getTemporalAnalysis({ country: "Japan", region: "Honshu" });
    await getTrendAnalysis({ resample_freq: "W", country: "Japan" });
    await getSeasonalityAnalysis({ country: "Japan" });
    await getPredictions(undefined, { country: "Japan" });
    await getClassifications(undefined, { country: "Japan" });
  } finally {
    restore();
  }
  assert.equal(new URL(urls[0]).searchParams.get("country"), "Japan");
  assert.equal(new URL(urls[0]).searchParams.get("region"), "Honshu");
  for (const url of urls) {
    assert.equal(new URL(url).searchParams.get("country"), "Japan");
  }
});

test("TC-03: không truyền filter → không query", async () => {
  const { urls, restore } = captureUrls(EMPTY);
  try {
    await getSeasonalityAnalysis();
    await getPredictions();
  } finally {
    restore();
  }
  assert.equal(new URL(urls[0]).search, "");
  assert.equal(new URL(urls[1]).search, "");
});

test("TC-04: EarthquakesPage dùng URL + lọc cả region", () => {
  const page = read("features/earthquakes/EarthquakesPage.tsx");
  assert.match(page, /useCatalogSelection\(\)/u);
  assert.match(page, /filterByCountryAndRegion\(chartItems, selectedCountry, selectedRegion\)/u);
  assert.match(page, /setSelection\(country, ALL_REGIONS\)/u);
  assert.match(page, /refreshKey, geo, undefined, \{/u);
});

test("TC-05: Overview & Statistics truyền filter", () => {
  const overview = read("features/overview/OverviewPage.tsx");
  assert.match(overview, /useOverviewData\(\{ country, region \}, dbReset\.refreshVersion, window\)/u);
  const statistics = read("features/statistics/statistics-data.tsx");
  assert.match(statistics, /useCatalogSelection\(\)/u);
  assert.match(statistics, /getPredictions\(signal, filter\)/u);
});
