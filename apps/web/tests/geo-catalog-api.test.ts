/**
 * Test offline cho services/geo-catalog-api.ts — danh mục quốc gia/khu vực từ BE.
 * testcase 2026-11-22-be-country-region-derivation-thien
 */

import test from "node:test";
import assert from "node:assert/strict";
import { getCountryCatalog, getRegionCatalog } from "../src/services/geo-catalog-api.ts";
import { ALL_COUNTRIES } from "../src/features/earthquakes/country-filter.ts";

function withFetch(payload: unknown, capture: string[]): () => void {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL) => {
    capture.push(String(input));
    return new Response(JSON.stringify(payload), { status: 200 });
  };
  return () => {
    globalThis.fetch = originalFetch;
  };
}

test("TC-10: getCountryCatalog gọi đúng endpoint và trả data", async () => {
  const urls: string[] = [];
  const restore = withFetch(
    { success: true, data: [{ country: "USA", count: 2 }] },
    urls,
  );
  try {
    const result = await getCountryCatalog();
    assert.equal(urls[0], "http://localhost:8000/api/v1/earthquakes/countries");
    assert.deepEqual(result.data, [{ country: "USA", count: 2 }]);
  } finally {
    restore();
  }
});

test("TC-11: getRegionCatalog mã hoá country, 'all' → không query", async () => {
  const urls: string[] = [];
  const restore = withFetch({ success: true, data: [] }, urls);
  try {
    await getRegionCatalog("Papua New Guinea");
    await getRegionCatalog(ALL_COUNTRIES);
    assert.equal(urls[0], "http://localhost:8000/api/v1/earthquakes/regions?country=Papua%20New%20Guinea");
    assert.equal(urls[1], "http://localhost:8000/api/v1/earthquakes/regions");
  } finally {
    restore();
  }
});
