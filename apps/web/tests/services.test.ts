/**
 * Unit test offline cho tầng services API (`earthquake-api.ts`).
 * Testcase: TC-03, TC-04, TC-05, TC-06, TC-07 trong
 * .agents/notes/testcase/2026-11-16-fe-contract-gis-reports-thien.md
 *
 * Chạy: cd apps/web && node --test tests/services.test.ts
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  getClusters,
  getClustersOptional,
  getEarthquakeDetail,
  getEarthquakeStatistics,
  getEarthquakes,
  getHealth,
  getHealthOptional,
  getOptionalApi,
  getPatterns,
  getPredictions,
  getClassifications,
  getSeasonalityAnalysis,
  getSystemStatus,
  getSystemStatusOptional,
  getTemporalAnalysis,
  getTrendAnalysis,
  getCorrelationAnalysis,
  syncUsgsData,
} from "../src/services/earthquake-api.ts";
import { ApiError } from "../src/lib/api-client.ts";
import { isApiEnvelope, isApiErrorEnvelope, isUtcTimestamp, isWgs84Bounds } from "../src/contracts/common.ts";

test("TC-01: exported service functions map to documented endpoint paths", async () => {
  const originalFetch = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = async (input: RequestInfo | URL) => {
    urls.push(String(input));
    return new Response(JSON.stringify({ success: true, data: { clusters: [], patterns: [], series: [], line_chart: [], scatter_plot: [], histogram: { magnitude_bins: [] }, components: { seasonal_line: [] }, variables: [], matrix: [], services: {} } }), { status: 200 });
  };
  try {
    await getEarthquakes();
    await getEarthquakeDetail(7);
    await getEarthquakeStatistics();
    await getPatterns();
    await getHealth();
    await getHealthOptional();
    await getSystemStatus();
    await getSystemStatusOptional();
    await getTemporalAnalysis();
    await getTrendAnalysis();
    await getSeasonalityAnalysis();
    await getCorrelationAnalysis();
    await getPredictions();
    await getClassifications();
    await getClusters();
    await getClustersOptional();
    await syncUsgsData();

    for (const path of [
      "/api/v1/earthquakes", "/api/v1/earthquakes/7", "/api/v1/statistics/earthquakes",
      "/api/v1/patterns", "/api/v1/health", "/api/v1/system/status",
      "/api/v1/analysis/temporal", "/api/v1/analysis/trend", "/api/v1/analysis/seasonality",
      "/api/v1/analysis/correlation", "/api/v1/predictions", "/api/v1/classifications",
      "/api/v1/clusters",
    ]) assert.ok(urls.some((url) => url.includes(path)), `Expected request for ${path}`);
    assert.ok(urls.some((url) => url.includes("/api/v1/earthquakes/sync")));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("TC-05: getEarthquakes tạo đúng query params (start_time, end_time, bbox WGS84)", async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";

  globalThis.fetch = async (input: RequestInfo | URL) => {
    capturedUrl = String(input);
    return new Response(
      JSON.stringify({
        success: true,
        data: [],
        metadata: { total: 0, page: 1, limit: 100, total_pages: 1 },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  try {
    await getEarthquakes({
      limit: 50,
      min_magnitude: 4.5,
      start_time: "2026-11-01T00:00:00Z",
      end_time: "2026-11-16T23:59:59Z",
      min_lat: 10,
      max_lat: 20,
      min_lon: 100,
      max_lon: 110,
    });

    assert.ok(capturedUrl.includes("limit=50"), "Phải có param limit");
    assert.ok(capturedUrl.includes("min_magnitude=4.5"), "Phải có param min_magnitude");
    assert.ok(capturedUrl.includes("start_time="), "Phải có param start_time");
    assert.ok(capturedUrl.includes("end_time="), "Phải có param end_time");
    assert.ok(capturedUrl.includes("min_lat=10"), "Phải có param min_lat");
    assert.ok(capturedUrl.includes("max_lat=20"), "Phải có param max_lat");
    assert.ok(capturedUrl.includes("min_lon=100"), "Phải có param min_lon");
    assert.ok(capturedUrl.includes("max_lon=110"), "Phải có param max_lon");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("TC-06: getOptionalApi trả { data: null, unavailable: true } khi 404 (không throw)", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => {
    return new Response(JSON.stringify({ detail: "Not Found" }), {
      status: 404,
      statusText: "Not Found",
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const res = await getSystemStatusOptional();
    assert.equal(res.unavailable, true, "Phải báo unavailable: true khi endpoint 404");
    assert.equal(res.data, null, "data phải là null khi unavailable");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("TC-07: getOptionalApi / fetchApi vẫn throw khi gặp lỗi server 500", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => {
    return new Response(JSON.stringify({ detail: "Internal Server Error" }), {
      status: 500,
      statusText: "Internal Server Error",
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    let didThrow = false;
    try {
      await getSystemStatusOptional();
    } catch (err) {
      didThrow = true;
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 500);
    }
    assert.equal(didThrow, true, "Lỗi 500 phải ném ra ApiError");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("TC-12: getClustersOptional 200 — không gọi /patterns (đường nhanh)", async () => {
  const originalFetch = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = async (input: RequestInfo | URL) => {
    urls.push(String(input));
    return new Response(JSON.stringify({ success: true, data: { clusters: [] } }), { status: 200 });
  };

  try {
    const res = await getClustersOptional();
    assert.equal(res.unavailable, false);
    assert.ok(res.data);
    assert.equal(urls.length, 1, "Chỉ gọi /clusters khi endpoint trả 200");
    assert.ok(urls[0].includes("/api/v1/clusters"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("TC-13: /clusters 404 → fallback /patterns.clustering_summary (dữ liệu thật)", async () => {
  const originalFetch = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = String(input);
    urls.push(url);
    if (url.includes("/api/v1/clusters")) {
      return new Response(JSON.stringify({ detail: "Not Found" }), { status: 404 });
    }
    return new Response(
      JSON.stringify({
        success: true,
        total_patterns: 6,
        patterns: [],
        clustering_summary: {
          clusters: [
            { id: 0, name: "San Andreas - California", lat: 35.7, lon: -118.5, events_count: 12, avg_mag: 5.4 },
          ],
        },
      }),
      { status: 200 },
    );
  };

  try {
    const res = await getClustersOptional();
    assert.equal(res.unavailable, false);
    assert.equal(res.status, 200);
    assert.ok(res.message?.includes("/api/v1/patterns"));
    assert.equal(res.data?.data.clusters[0].cluster_id, 0);
    assert.equal(res.data?.data.clusters[0].event_count, 12);
    assert.equal(res.data?.data.clusters[0].center_latitude, 35.7);
    assert.equal(urls.length, 2, "Phải gọi cả /clusters lẫn /patterns");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("TC-14: /clusters 404 + /patterns rỗng → giữ unavailable: true, data: null", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL) => {
    if (String(input).includes("/api/v1/clusters")) {
      return new Response(JSON.stringify({ detail: "Not Found" }), { status: 404 });
    }
    return new Response(
      JSON.stringify({ success: false, total_patterns: 0, patterns: [], message: "CSDL trống" }),
      { status: 200 },
    );
  };

  try {
    const res = await getClustersOptional();
    assert.equal(res.unavailable, true);
    assert.equal(res.data, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("TC-15: /clusters 404 + /patterns 500 → nuốt lỗi fallback, không throw", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL) => {
    if (String(input).includes("/api/v1/clusters")) {
      return new Response(JSON.stringify({ detail: "Not Found" }), { status: 404 });
    }
    return new Response(JSON.stringify({ detail: "Server Error" }), { status: 500 });
  };

  try {
    const res = await getClustersOptional();
    assert.equal(res.unavailable, true);
    assert.equal(res.data, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("TC-16: getPatterns chấp nhận aggregate envelope không có khóa data", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        success: true,
        total_patterns: 6,
        patterns: [],
        clustering_summary: { clusters: [] },
      }),
      { status: 200 },
    );

  try {
    const patterns = await getPatterns();
    assert.equal(patterns.success, true);
    assert.equal(patterns.total_patterns, 6);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("TC-08: UTC timestamps and WGS84 bounds are validated before fetch", async () => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    return new Response(JSON.stringify({ success: true, data: [], metadata: { total: 0, page: 1, limit: 20, total_pages: 0 } }), { status: 200 });
  };

  try {
    await assert.rejects(() => getEarthquakes({ start_time: "2026-11-01T00:00:00+07:00" }), /hậu tố Z/u);
    await assert.rejects(() => getEarthquakes({ start_time: "2026-11-02T00:00:00Z", end_time: "2026-11-01T00:00:00Z" }), /start_time/u);
    await assert.rejects(() => getEarthquakes({ min_lat: -91 }), /WGS84/u);
    await assert.rejects(() => getEarthquakes({ min_lon: 120, max_lon: 100 }), /WGS84/u);
    assert.equal(requestCount, 0, "Invalid params must be rejected before network fetch");

    await getEarthquakes({ start_time: "2026-11-01T00:00:00Z", end_time: "2026-11-02T00:00:00Z", min_lat: -90, max_lat: 90, min_lon: -180, max_lon: 180 });
    assert.equal(requestCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("TC-09: contract guards narrow success/error envelope and UTC/WGS84 values", () => {
  assert.equal(isApiEnvelope({ success: true, data: [] }), true);
  assert.equal(isApiEnvelope({ success: false, error: {} }), false);
  assert.equal(isApiErrorEnvelope({ success: false, error: { code: "DATABASE_ERROR", message: "db down" } }), true);
  assert.equal(isApiErrorEnvelope({ success: false, error: { code: 1, message: "bad" } }), false);
  assert.equal(isUtcTimestamp("2026-11-01T00:00:00Z"), true);
  assert.equal(isUtcTimestamp("2026-11-01T00:00:00+07:00"), false);
  assert.equal(isWgs84Bounds({ min_lat: -90, max_lat: 90, min_lon: -180, max_lon: 180 }), true);
  assert.equal(isWgs84Bounds({ min_lat: 91 }), false);
  assert.equal(isWgs84Bounds({ min_lat: 20, max_lat: 10 }), false);
});

test("TC-10: API error envelope preserves code/details and legacy detail remains supported", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ success: false, error: { code: "VALIDATION_ERROR", message: "bad query", details: { field: "start_time" } } }), { status: 400 });
  try {
    await assert.rejects(() => getOptionalApi("/api/v1/bad"), (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 400);
      assert.equal(error.code, "VALIDATION_ERROR");
      assert.deepEqual(error.details, { field: "start_time" });
      assert.equal(error.message, "bad query");
      return true;
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("TC-11: optional API chỉ chuyển 404 thành unavailable, các lỗi khác giữ ApiError", async () => {
  const originalFetch = globalThis.fetch;
  try {
    for (const status of [400, 500, 503]) {
      globalThis.fetch = async () => new Response(JSON.stringify({ success: false, error: { code: "SERVICE_UNAVAILABLE", message: `status ${status}` } }), { status });
      await assert.rejects(() => getOptionalApi("/api/v1/optional"), (error: unknown) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.status, status);
        return true;
      });
    }
    globalThis.fetch = async () => { throw new Error("offline"); };
    await assert.rejects(() => getOptionalApi("/api/v1/optional"), (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 0);
      return true;
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("TC-03: getClusters nhận phản hồi canonical thành công", async () => {
  const originalFetch = globalThis.fetch;

  const mockClustersResponse = {
    success: true,
    data: {
      algorithm: "DBSCAN",
      parameters: { eps_km: 100, min_samples: 5 },
      clusters_count: 1,
      noise_count: 3,
      calculated_at: "2026-11-16T12:00:00Z",
      clusters: [
        {
          cluster_id: 1,
          center_latitude: 16.0,
          center_longitude: 108.0,
          event_count: 25,
          avg_magnitude: 4.2,
          max_magnitude: 5.8,
          radius_km: 95,
        },
      ],
    },
  };

  globalThis.fetch = async () => {
    return new Response(JSON.stringify(mockClustersResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const res = await getClusters();
    assert.equal(res.success, true);
    assert.equal(res.data.clusters_count, 1);
    assert.equal(res.data.clusters[0].cluster_id, 1);
    assert.equal(res.data.clusters[0].center_latitude, 16.0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getEarthquakeStatistics gửi bộ lọc số cho KPI Danh mục", async () => {
  const originalFetch = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = async (input: RequestInfo | URL) => {
    urls.push(String(input));
    return new Response(JSON.stringify({ success: true, data: { data: {} } }), { status: 200 });
  };
  try {
    await getEarthquakeStatistics(undefined, { country: "Japan", region: "Tokyo" },
      { start_time: "2026-11-01T00:00:00.000Z", end_time: "2026-11-24T00:00:00.000Z" },
      { min_magnitude: 5, max_magnitude: 7, min_depth: 10, max_depth: 100 });
    const url = new URL(urls[0]);
    assert.equal(url.pathname, "/api/v1/statistics/earthquakes");
    assert.equal(url.searchParams.get("country"), "Japan");
    assert.equal(url.searchParams.get("min_magnitude"), "5");
    assert.equal(url.searchParams.get("max_depth"), "100");
    assert.equal(url.searchParams.get("start_time"), "2026-11-01T00:00:00.000Z");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getTrendAnalysis gửi timezone cho bucket ngày theo UTC+7", async () => {
  const originalFetch = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = async (input: RequestInfo | URL) => {
    urls.push(String(input));
    return new Response(JSON.stringify({ success: true, data: { series: [] } }), { status: 200 });
  };
  try {
    await getTrendAnalysis({ resample_freq: "D", metric: "count", timezone: "UTC+7" });
    const url = new URL(urls[0]);
    assert.equal(url.pathname, "/api/v1/analysis/trend");
    assert.equal(url.searchParams.get("timezone"), "UTC+7");
    assert.equal(url.searchParams.get("resample_freq"), "D");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
