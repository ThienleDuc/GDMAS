/**
 * Unit test offline cho lớp lib/contracts sau khi tái thiết.
 * Nguồn: docs/api/API.md §2–§4, contracts/README.md §3.2/§3.5, docs/architecture.md §12.
 * Chạy: cd apps/web && node --test tests/lib-redesign.test.ts
 */
import assert from "node:assert/strict";
import test from "node:test";

import { SSE_EVENT_NAMES, isSseEventName } from "../src/contracts/sse.ts";
import { SERVICE_LABELS } from "../src/contracts/system-status.ts";
import {
  isKnownSseEvent,
  nextBackoff,
  parseSsePayload,
  resolveSseUrl,
  shouldGiveUp,
  sseStatusLabel,
} from "../src/lib/sse.ts";
import {
  formatWgs84Point,
  isUtcIso,
  isWgs84,
  toUtcIso,
} from "../src/lib/formatters.ts";

test("TC-01: SSE_EVENT_NAMES là hợp của route hiện hành và docs/api/API.md §3.5", () => {
  assert.deepEqual([...SSE_EVENT_NAMES], [
    "earthquake_detected",
    "earthquake_alert",
    "heartbeat",
    "alert",
    "ingestion_cycle_completed",
    "database_cleared",
  ]);
  assert.equal(isSseEventName("earthquake_alert"), true);
  assert.equal(isSseEventName("unknown_event"), false);
  assert.equal(isKnownSseEvent("database_cleared"), true);
});

test("TC-02: parseSsePayload đọc payload hợp lệ, giữ id/retry và fallback timestamp", () => {
  const payload = parseSsePayload(
    JSON.stringify({
      event: "earthquake_detected",
      data: { id: 1043, magnitude: 6.2 },
      timestamp: "2026-11-06T11:08:00Z",
      id: "evt-7",
      retry: 3000,
    }),
  );
  assert.ok(payload);
  assert.equal(payload.event, "earthquake_detected");
  assert.deepEqual(payload.data, { id: 1043, magnitude: 6.2 });
  assert.equal(payload.timestamp, "2026-11-06T11:08:00Z");
  assert.equal(payload.id, "evt-7");
  assert.equal(payload.retry, 3000);

  const noTimestamp = parseSsePayload(JSON.stringify({ event: "heartbeat", data: {} }));
  assert.ok(noTimestamp);
  assert.match(noTimestamp.timestamp, /Z$/u);
});

test("TC-03: parseSsePayload trả null cho payload hỏng (không làm sập luồng SSE)", () => {
  assert.equal(parseSsePayload(""), null);
  assert.equal(parseSsePayload("not json"), null);
  assert.equal(parseSsePayload("[]"), null);
  assert.equal(parseSsePayload(JSON.stringify({ data: {} })), null);
  assert.equal(parseSsePayload(JSON.stringify({ event: "x" })), null);
});

test("TC-04: nextBackoff tăng dần, chặn trần 30s và shouldGiveUp đúng ngưỡng", () => {
  const fixed = () => 0.5;
  const b0 = nextBackoff(0, { random: fixed });
  const b1 = nextBackoff(1, { random: fixed });
  const b5 = nextBackoff(5, { random: fixed });
  const b10 = nextBackoff(10, { random: fixed });
  assert.ok(b0 > 0 && b1 > b0 && b5 > b1);
  assert.equal(b5, 30_000);
  assert.equal(b10, 30_000);
  assert.equal(shouldGiveUp(8), false);
  assert.equal(shouldGiveUp(9), true);
});

test("TC-05: resolveSseUrl giữ URL tuyệt đối, fallback khi rỗng, ghép base khi tương đối", () => {
  assert.equal(
    resolveSseUrl("https://be.local/stream", "http://localhost:8000"),
    "https://be.local/stream",
  );
  assert.equal(
    resolveSseUrl(undefined, "http://localhost:8000/"),
    "http://localhost:8000/api/v1/stream/earthquakes",
  );
  assert.equal(
    resolveSseUrl("  ", "http://localhost:8000"),
    "http://localhost:8000/api/v1/stream/earthquakes",
  );
  assert.equal(
    resolveSseUrl("/api/v1/events/stream", "http://localhost:8000"),
    "http://localhost:8000/api/v1/events/stream",
  );
});

test("TC-06: formatters chuẩn UTC ISO 8601 và WGS84", () => {
  assert.equal(toUtcIso("2026-11-06T11:08:00Z"), "2026-11-06T11:08:00.000Z");
  assert.equal(isUtcIso("2026-11-06T11:08:00Z"), true);
  assert.equal(isUtcIso("2026-11-06 11:08:00"), false);
  assert.equal(isUtcIso(123), false);
  assert.equal(isWgs84(35.6895, 139.6917), true);
  assert.equal(isWgs84(-91, 0), false);
  assert.equal(isWgs84(0, 181), false);
  assert.equal(formatWgs84Point(35.6895, 139.6917, 4), "35.6895° N, 139.6917° E");
  assert.equal(formatWgs84Point(-6.2, 106.8, 2), "6.20° S, 106.80° E");
  assert.equal(formatWgs84Point(100, 0), "—");
});

test("TC-07: contracts barrel re-export đủ runtime value cho consumer cũ", () => {
  assert.equal(SERVICE_LABELS.api, "Database API");
  assert.equal(Object.keys(SERVICE_LABELS).length, 7);
  assert.equal(sseStatusLabel("open"), "SSE LIVE");
});
