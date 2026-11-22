/**
 * Test offline cho nút đồng bộ USGS (RD-14) — mock fetch, KHÔNG gọi USGS thật.
 * Chạy: cd apps/web && node --test tests/usgs-sync.test.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolve } from "node:path";
import type { SyncResponse } from "../src/contracts/earthquake.ts";
import { ApiError } from "../src/lib/api-client.ts";
import { syncUsgsData } from "../src/services/earthquake-api.ts";
import {
  formatSyncMessage,
  syncErrorMessage,
  syncReducer,
  type SyncUiState,
} from "../src/features/earthquakes/usgs-sync.ts";

const SYNC_PAYLOAD: SyncResponse = {
  success: true,
  message: "Đã đồng bộ thành công 3 sự kiện từ USGS GeoJSON Feed.",
  synced_count: 3,
  source: "USGS",
  timestamp: "2026-11-22T08:00:00Z",
};

function mockFetch(payload: unknown, status = 200) {
  const original = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return new Response(JSON.stringify(payload), { status });
  };
  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

test("TC-01 — payload SyncResponse thật (không có data) vẫn resolve, đúng POST", async () => {
  const mock = mockFetch(SYNC_PAYLOAD);
  try {
    const result = await syncUsgsData();
    assert.equal(result.synced_count, 3);
    assert.equal(result.timestamp, "2026-11-22T08:00:00Z");
    assert.equal(mock.calls[0].init?.method, "POST");
    assert.match(mock.calls[0].url, /\/api\/v1\/earthquakes\/sync$/u);
  } finally {
    mock.restore();
  }
});

test("TC-02 — 503/500/mạng ném ApiError với status/code", async () => {
  const cases: Array<[number, unknown, number, string | undefined]> = [
    [
      503,
      { success: false, error: { code: "DATA_SOURCE_UNAVAILABLE", message: "USGS lỗi" } },
      503,
      "DATA_SOURCE_UNAVAILABLE",
    ],
    [
      500,
      { success: false, error: { code: "DATABASE_ERROR", message: "DB lỗi" } },
      500,
      "DATABASE_ERROR",
    ],
  ];
  for (const [status, payload, expectedStatus, expectedCode] of cases) {
    const mock = mockFetch(payload, status);
    try {
      await assert.rejects(
        () => syncUsgsData(),
        (error: unknown) =>
          error instanceof ApiError &&
          error.status === expectedStatus &&
          error.code === expectedCode,
      );
    } finally {
      mock.restore();
    }
  }
});

test("TC-03 — truyền AbortSignal xuống fetch", async () => {
  const mock = mockFetch(SYNC_PAYLOAD);
  const controller = new AbortController();
  try {
    await syncUsgsData(controller.signal);
    assert.equal(mock.calls[0].init?.signal, controller.signal);
  } finally {
    mock.restore();
  }
});

test("TC-04/05 — state machine chỉ start từ confirming, cancel về idle", () => {
  let state: SyncUiState = "idle";
  state = syncReducer(state, { type: "start" });
  assert.equal(state, "idle", "Không được gọi API khi chưa xác nhận");
  state = syncReducer(state, { type: "ask" });
  assert.equal(state, "confirming");
  state = syncReducer(state, { type: "cancel" });
  assert.equal(state, "idle");

  state = syncReducer(syncReducer(syncReducer("idle", { type: "ask" }), { type: "start" }), {
    type: "success",
  });
  assert.equal(state, "done");
  state = syncReducer(syncReducer(syncReducer("idle", { type: "ask" }), { type: "start" }), {
    type: "failure",
  });
  assert.equal(state, "error");
  assert.equal(syncReducer("done", { type: "dismiss" }), "idle");
});

test("TC-06 — format message giữ timestamp Z, lỗi 503 có thông báo riêng", () => {
  assert.match(formatSyncMessage(SYNC_PAYLOAD), /3 sự kiện/u);
  assert.match(formatSyncMessage(SYNC_PAYLOAD), /2026-11-22T08:00:00Z/u);
  assert.match(syncErrorMessage(new ApiError("lỗi", 503, "DATA_SOURCE_UNAVAILABLE")), /USGS/u);
  assert.match(syncErrorMessage(new ApiError("lỗi", 500)), /cơ sở dữ liệu/u);
  assert.match(syncErrorMessage(new Error("offline")), /Không thể đồng bộ/u);
});

test("TC-07 — wiring trang /earthquakes, vẫn cấm table thô", () => {
  const sourceRoot = resolve(import.meta.dirname, "../src");
  const page = readFileSync(resolve(sourceRoot, "features/earthquakes/EarthquakesPage.tsx"), "utf8");

  assert.match(page, /<UsgsSyncButton onSynced=\{handleSynced\} \/>/u);
  assert.doesNotMatch(page, /<table\b/u);
});

test("TC-08 — dev-mock vẫn không phục vụ POST sync (không mock runtime)", () => {
  const devMockTest = readFileSync(
    resolve(import.meta.dirname, "dev-mock.test.ts"),
    "utf8",
  );
  assert.match(devMockTest, /resolveContractMock\("POST", "\/api\/v1\/earthquakes\/sync"/u);
});
