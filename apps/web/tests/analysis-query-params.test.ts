/**
 * Unit test offline — query param của 3 endpoint analysis theo API.md §3.3.
 * Testcase: .agents/notes/testcase/2026-11-22-analysis-unsupported-query-params-thien.md
 *
 * Chạy: cd apps/web && node --test tests/analysis-query-params.test.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolve } from "node:path";
import {
  getCorrelationAnalysis,
  getSeasonalityAnalysis,
  getTrendAnalysis,
} from "../src/services/earthquake-api.ts";

const OK = {
  success: true,
  data: {
    series: [],
    status: "computed",
    components: { seasonal_line: [] },
    variables: [],
    matrix: [],
  },
};

function captureUrls(): { urls: string[]; restore: () => void } {
  const originalFetch = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = async (input: RequestInfo | URL) => {
    urls.push(String(input));
    return new Response(JSON.stringify(OK), { status: 200 });
  };
  return {
    urls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

test("TC-01 — trend chỉ gửi resample_freq, không gửi start_time/end_time", async () => {
  const { urls, restore } = captureUrls();
  try {
    await getTrendAnalysis({ resample_freq: "D" });
    assert.equal(urls.length, 1);
    const url = new URL(urls[0]);
    assert.equal(url.searchParams.get("resample_freq"), "D");
    assert.equal(url.searchParams.has("start_time"), false);
    assert.equal(url.searchParams.has("end_time"), false);
  } finally {
    restore();
  }
});

// Cập nhật 2026-11-23: trend giờ nhận cửa sổ thời gian thật (lọc Ngày/Tuần/Tháng).
test("TC-02 — trend forward cửa sổ thời gian khi được truyền", async () => {
  const { urls, restore } = captureUrls();
  try {
    await getTrendAnalysis({
      resample_freq: "D",
      start_time: "2026-11-08T12:00:00.000Z",
      end_time: "2026-11-22T12:00:00.000Z",
    });
    const url = new URL(urls[0]);
    assert.equal(url.searchParams.get("resample_freq"), "D");
    assert.equal(url.searchParams.get("start_time"), "2026-11-08T12:00:00.000Z");
    assert.equal(url.searchParams.get("end_time"), "2026-11-22T12:00:00.000Z");
  } finally {
    restore();
  }
});

test("TC-03 — seasonality truyền cửa sổ start_time (2026-11-24)", async () => {
  const { urls, restore } = captureUrls();
  try {
    await getSeasonalityAnalysis({
      start_time: "2026-11-08T12:00:00.000Z",
      end_time: "2026-11-22T12:00:00.000Z",
    });
    const url = new URL(urls[0]);
    assert.equal(url.searchParams.get("start_time"), "2026-11-08T12:00:00.000Z");
    assert.equal(url.searchParams.get("end_time"), "2026-11-22T12:00:00.000Z");
  } finally {
    restore();
  }
});

test("TC-04 — correlation không tạo query string", async () => {
  const { urls, restore } = captureUrls();
  try {
    await getCorrelationAnalysis({ start_time: "2026-11-08T12:00:00.000Z" });
    assert.equal(new URL(urls[0]).search, "");
  } finally {
    restore();
  }
});

test("TC-05 — Overview không còn cửa sổ 14 ngày giả", () => {
  const source = readFileSync(
    resolve(import.meta.dirname, "../src/features/overview/useOverviewData.ts"),
    "utf8",
  );
  assert.doesNotMatch(source, /toUtcIso/u);
  assert.doesNotMatch(source, /const\s+window\s*=/u);
  // Cập nhật 2026-11-23: forward filter + cửa sổ thật (từ ?range=), không còn số giả 14 ngày.
  assert.match(source, /getTrendAnalysis\(/u);
  assert.match(source, /resample_freq: "D"/u);
  assert.match(source, /\.\.\.window/u);
  assert.match(source, /getSeasonalityAnalysis\(\{ \.\.\.geoQuery\(filter\), \.\.\.window \}/u);
  assert.doesNotMatch(source, /getMonthlyPeaks/u);
});
