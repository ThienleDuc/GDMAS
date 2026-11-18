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
  getEarthquakes,
  getOptionalApi,
  getSystemStatusOptional,
} from "../src/services/earthquake-api.ts";
import { ApiError } from "../src/lib/api-client.ts";

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
