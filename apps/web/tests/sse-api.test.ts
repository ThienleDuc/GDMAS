import assert from "node:assert/strict";
import test from "node:test";
import { SSE_EVENT_NAMES } from "../src/contracts/sse.ts";
import {
  connectEventsStream,
  DEFAULT_EVENTS_ENDPOINT,
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

test("TC-08: SSE service defaults to API.md events stream and supports legacy override", () => {
  assert.equal(DEFAULT_EVENTS_ENDPOINT, "/api/v1/events/stream");
  assert.equal(getEventsStreamUrl(), "http://localhost:8000/api/v1/events/stream");
  assert.equal(getEventsStreamUrl(LEGACY_STREAM_ENDPOINT), "http://localhost:8000/api/v1/stream/earthquakes");
  assert.equal(getEventsStreamUrl("https://events.example.test/stream"), "https://events.example.test/stream");
});

test("TC-10: connectEventsStream wires all contract event names and closes the source", () => {
  const restore = installFakeEventSource();
  try {
    const received: unknown[] = [];
    const connection = connectEventsStream({ onPayload: (payload) => received.push(payload) });
    const source = FakeEventSource.instances[0];
    assert.equal(source.url, "http://localhost:8000/api/v1/events/stream");
    assert.deepEqual([...source.listeners.keys()], [...SSE_EVENT_NAMES]);

    const callback = source.listeners.get("earthquake_alert")?.values().next().value;
    assert.ok(callback);
    callback({ data: JSON.stringify({ event: "earthquake_alert", data: { magnitude: 5 }, timestamp: "2026-11-20T00:00:00Z" }) } as MessageEvent<string>);
    assert.equal(received.length, 1);
    assert.equal((received[0] as { event: string }).event, "earthquake_alert");

    connection.close();
    assert.equal(source.closed, true);
  } finally {
    restore();
  }
});
