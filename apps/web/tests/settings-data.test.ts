/**
 * Unit test offline cho logic đánh giá độ tươi mới dữ liệu theo docs/architecture.md §9.4.
 * Testcase: TC-19 trong .agents/notes/testcase/2026-11-16-fe-contract-gis-reports-thien.md
 *
 * Chạy: cd apps/web && node --test tests/settings-data.test.ts
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateServiceFreshness,
  formatElapsedMinutes,
  TERMINAL_KEYS,
  TERMINAL_SPECS,
} from "../src/features/settings/settings-data.ts";

test("TC-19: Đủ 7 Terminals chuẩn theo kiến trúc GDMAS", () => {
  assert.equal(TERMINAL_KEYS.length, 7);
  const expectedKeys = [
    "postgres",
    "ingestion",
    "analysis",
    "clustering",
    "prediction",
    "api",
    "frontend",
  ];
  assert.deepEqual(TERMINAL_KEYS, expectedKeys);

  for (const key of TERMINAL_KEYS) {
    const spec = TERMINAL_SPECS[key];
    assert.ok(spec, `Terminal ${key} phải có thông số khai báo`);
    assert.ok(spec.terminalId.startsWith("T"));
    assert.ok(spec.name.length > 0);
  }
});

test("TC-19: Đánh giá độ tươi mới tiến trình chu kỳ 5 phút (§9.4)", () => {
  const now = new Date("2026-11-16T12:00:00Z");

  // 1. Chạy 5 phút trước -> Fresh (Hoạt động tốt)
  const freshSvc = {
    status: "active" as const,
    last_run: "2026-11-16T11:55:00Z",
    cycle: "5m",
  };
  const resFresh = evaluateServiceFreshness(freshSvc, now);
  assert.equal(resFresh.state, "fresh");
  assert.equal(resFresh.diffMinutes, 5);

  // 2. Chạy 16 phút trước (> 15m) -> Stale (Dữ liệu cũ)
  const staleSvc = {
    status: "active" as const,
    last_run: "2026-11-16T11:44:00Z",
    cycle: "5m",
  };
  const resStale = evaluateServiceFreshness(staleSvc, now);
  assert.equal(resStale.state, "stale");
  assert.equal(resStale.diffMinutes, 16);

  // 3. Chạy 65 phút trước (> 60m) -> Interrupted (Gián đoạn)
  const interruptedSvc = {
    status: "active" as const,
    last_run: "2026-11-16T10:55:00Z",
    cycle: "5m",
  };
  const resInterrupted = evaluateServiceFreshness(interruptedSvc, now);
  assert.equal(resInterrupted.state, "interrupted");
  assert.equal(resInterrupted.diffMinutes, 65);
});

test("TC-19: Đánh giá độ tươi mới tiến trình Clustering chu kỳ 1 ngày (§9.4)", () => {
  const now = new Date("2026-11-16T12:00:00Z");

  // 1. Chạy 20 giờ trước (< 26h) -> Fresh
  const freshClustering = {
    status: "idle" as const,
    last_run: "2026-11-15T16:00:00Z",
    cycle: "1d",
  };
  const resFresh = evaluateServiceFreshness(freshClustering, now);
  assert.equal(resFresh.state, "fresh");

  // 2. Chạy 27 giờ trước (> 26h) -> Stale
  const staleClustering = {
    status: "idle" as const,
    last_run: "2026-11-15T09:00:00Z",
    cycle: "1d",
  };
  const resStale = evaluateServiceFreshness(staleClustering, now);
  assert.equal(resStale.state, "stale");

  // 3. Chạy 50 giờ trước (> 48h) -> Interrupted
  const interruptedClustering = {
    status: "idle" as const,
    last_run: "2026-11-14T10:00:00Z",
    cycle: "1d",
  };
  const resInterrupted = evaluateServiceFreshness(interruptedClustering, now);
  assert.equal(resInterrupted.state, "interrupted");
});

test("Định dạng khoảng thời gian trôi qua dễ đọc tiếng Việt", () => {
  assert.equal(formatElapsedMinutes(0), "Vừa xong");
  assert.equal(formatElapsedMinutes(15), "15 phút trước");
  assert.equal(formatElapsedMinutes(60), "1 giờ trước");
  assert.equal(formatElapsedMinutes(90), "1 giờ 30 phút trước");
  assert.equal(formatElapsedMinutes(1440), "1 ngày trước");
  assert.equal(formatElapsedMinutes(null), "—");
});
