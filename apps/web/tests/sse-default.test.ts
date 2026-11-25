/**
 * Test offline cho RD-17 — endpoint SSE chuẩn làm default, legacy vẫn override được.
 * Không gọi mạng: FakeEventSource + getEventsStreamUrl thuần.
 * Chạy: cd apps/web && node --test tests/sse-default.test.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolve } from "node:path";
import {
  connectEventsStream,
  getEventsStreamUrl,
  LEGACY_STREAM_ENDPOINT,
} from "../src/services/sse-api.ts";

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  readonly url: string;
  readonly listeners = new Map<string, Set<(event: MessageEvent<string>) => void>>();
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  closed = false;

  constructor(url: string | URL) {
    this.url = String(url);
    FakeEventSource.instances.push(this);
  }

  addEventListener(name: string, listener: (event: MessageEvent<string>) => void): void {
    const listeners = this.listeners.get(name) ?? new Set();
    listeners.add(listener);
    this.listeners.set(name, listeners);
  }

  close(): void {
    this.closed = true;
  }
}

function installFakeEventSource() {
  const original = globalThis.EventSource;
  FakeEventSource.instances = [];
  globalThis.EventSource = FakeEventSource as unknown as typeof EventSource;
  return () => {
    globalThis.EventSource = original;
    FakeEventSource.instances = [];
  };
}

test("TC-01 — default là route SSE chuẩn theo API.md", () => {
  assert.equal(getEventsStreamUrl(), "http://localhost:8000/api/v1/events/stream");
});

test("TC-02 — legacy vẫn override được qua đối số", () => {
  assert.equal(
    getEventsStreamUrl(LEGACY_STREAM_ENDPOINT),
    "http://localhost:8000/api/v1/stream/earthquakes",
  );
});

test("TC-03 — connectEventsStream với legacy mở đúng URL cũ", () => {
  const restore = installFakeEventSource();
  try {
    const connection = connectEventsStream({
      endpoint: LEGACY_STREAM_ENDPOINT,
      onPayload: () => undefined,
    });
    assert.equal(FakeEventSource.instances[0].url, "http://localhost:8000/api/v1/stream/earthquakes");
    connection.close();
  } finally {
    restore();
  }
});

test("TC-04/05 — useSSE ủy quyền cho service và giữ chữ ký", () => {
  const hook = readFileSync(resolve(import.meta.dirname, "../src/hooks/useSSE.ts"), "utf8");

  assert.match(hook, /getEventsStreamUrl\(endpoint\)/u);
  assert.match(hook, /export \{ LEGACY_STREAM_ENDPOINT \}/u);
  assert.match(hook, /function useSSE\(endpoint\?: string\)/u);
  assert.doesNotMatch(hook, /DEFAULT_ENDPOINT/u);
  assert.doesNotMatch(hook, /ENV_ENDPOINT/u);
});

test("TC-06 — shell dùng default, không hardcode route legacy", () => {
  const layout = readFileSync(
    resolve(import.meta.dirname, "../src/layouts/DashboardLayout.tsx"),
    "utf8",
  );

  assert.match(layout, /useSSE\(\)/u);
  assert.doesNotMatch(layout, /\/api\/v1\/stream\/earthquakes/u);
});
