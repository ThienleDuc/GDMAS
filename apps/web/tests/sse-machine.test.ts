/**
 * Unit test offline cho máy trạng thái và logic kết nối SSE (`sse-machine.ts`).
 * Testcase: TC-15, TC-16, TC-17, TC-18 trong
 * .agents/notes/testcase/2026-11-16-fe-contract-gis-reports-thien.md
 *
 * Chạy: cd apps/web && node --test tests/sse-machine.test.ts
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  isKnownSseEvent,
  nextBackoff,
  resolveSseUrl,
  shouldGiveUp,
  sseStatusLabel,
  SSE_EVENT_NAMES,
  SSE_MAX_RECONNECT_ATTEMPTS,
} from "../src/hooks/sse-machine.ts";

test("TC-17: SSE_EVENT_NAMES là hợp của route hiện hành và docs/api/API.md §3.5", () => {
  const expectedEvents = [
    "earthquake_detected",
    "earthquake_alert",
    "heartbeat",
    "alert",
    "ingestion_cycle_completed",
    "database_cleared",
  ];

  for (const name of expectedEvents) {
    assert.ok(
      isKnownSseEvent(name),
      `Tên sự kiện "${name}" phải nằm trong danh mục sự kiện SSE hợp lệ`
    );
  }

  assert.equal(isKnownSseEvent("unknown_event"), false);
});

test("TC-16: SSE exponential backoff tăng dần và bị chặn trần 30 giây", () => {
  // Test tất định với jitter = 0 (random luôn trả 0.5 -> (0.5*2 - 1) = 0)
  const mockRandom = () => 0.5;

  const b0 = nextBackoff(0, { random: mockRandom });
  const b1 = nextBackoff(1, { random: mockRandom });
  const b2 = nextBackoff(2, { random: mockRandom });
  const b5 = nextBackoff(5, { random: mockRandom });
  const b10 = nextBackoff(10, { random: mockRandom });

  assert.equal(b0, 1000);  // 1s
  assert.equal(b1, 2000);  // 2s
  assert.equal(b2, 4000);  // 4s
  assert.equal(b5, 30000); // 32s kẹp trần 30s
  assert.equal(b10, 30000); // Kẹp trần 30s
});

test("TC-15: Ngừng thử lại khi vượt quá SSE_MAX_RECONNECT_ATTEMPTS", () => {
  assert.equal(shouldGiveUp(1), false);
  assert.equal(shouldGiveUp(SSE_MAX_RECONNECT_ATTEMPTS), false);
  assert.equal(shouldGiveUp(SSE_MAX_RECONNECT_ATTEMPTS + 1), true);
});

test("TC-18: Chuẩn hoá URL SSE (resolveSseUrl)", () => {
  const base = "http://localhost:8000";

  // Endpoint tương đối
  assert.equal(
    resolveSseUrl("/api/v1/stream/earthquakes", base),
    "http://localhost:8000/api/v1/stream/earthquakes"
  );
  assert.equal(
    resolveSseUrl("api/v1/events/stream", base),
    "http://localhost:8000/api/v1/events/stream"
  );

  // Endpoint tuyệt đối giữ nguyên
  assert.equal(
    resolveSseUrl("https://production.gdmas.org/stream", base),
    "https://production.gdmas.org/stream"
  );

  // Mặc định khi để trống
  assert.equal(
    resolveSseUrl(undefined, base, "/api/v1/stream/earthquakes"),
    "http://localhost:8000/api/v1/stream/earthquakes"
  );
});

test("Nhãn trạng thái tiếng Việt cho ConnectionStatusBadge", () => {
  assert.equal(sseStatusLabel("open"), "SSE LIVE");
  assert.equal(sseStatusLabel("reconnecting"), "SSE Đang kết nối lại…");
  assert.equal(sseStatusLabel("disconnected"), "SSE Mất kết nối");
  assert.equal(sseStatusLabel("connecting"), "SSE Đang kết nối…");
});
