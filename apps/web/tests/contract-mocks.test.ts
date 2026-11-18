import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  analysisFixture,
  classificationsFixture,
  clustersFixture,
  earthquakeFixture,
  healthFixture,
  patternsFixture,
  predictionsFixture,
  sseEventFixture,
  systemStatusFixture,
} from "./mocks/fixtures.ts";
import {
  createFetchMock,
  emptyResponse,
  errorResponse,
  successResponse,
} from "./mocks/fetch-mock.ts";
import { installEventSourceMock } from "./mocks/sse-mock.ts";
import { getEarthquakeDetail, getEarthquakes, getOptionalApi } from "../src/services/earthquake-api.ts";
import { ApiError } from "../src/lib/api-client.ts";

const repoRoot = resolve(import.meta.dirname, "../../..");
const readJson = (path: string) => JSON.parse(readFileSync(resolve(repoRoot, path), "utf8"));

function assertUtcWgs84(payload: unknown): void {
  const value = payload as Record<string, unknown>;
  const eventTime = value.event_time;
  assert.equal(typeof eventTime, "string");
  assert.match(eventTime as string, /Z$/u, "canonical event_time is UTC ISO 8601");
  assert.ok(typeof value.latitude === "number" && value.latitude >= -90 && value.latitude <= 90);
  assert.ok(typeof value.longitude === "number" && value.longitude >= -180 && value.longitude <= 180);
}

test("TC-01: fixtures are read from contracts examples and earthquake sample matches canonical schema", () => {
  const fixtureNames = [
    "earthquake_sample.json",
    "patterns_sample.json",
    "analysis_sample.json",
    "health_sample.json",
    "system_status_sample.json",
    "predictions_sample.json",
    "classifications_sample.json",
    "clusters_sample.json",
    "sse-event_sample.json",
  ];
  for (const name of fixtureNames) {
    assert.doesNotThrow(() => readJson(`contracts/examples/${name}`), `${name} parses as JSON`);
  }

  const schema = readJson("contracts/schemas/earthquake.json") as {
    required: string[];
    properties: Record<string, unknown>;
  };
  const earthquake = earthquakeFixture();
  for (const required of schema.required) {
    assert.ok(required in earthquake, `canonical sample includes required field ${required}`);
  }
  assert.equal(typeof earthquake.id, "number");
  assert.equal(typeof earthquake.source_event_id, "string");
  assert.ok("event_time" in earthquake && "depth_km" in earthquake);
  assertUtcWgs84(earthquake);
  assert.ok("time" in schema.properties && "depth" in schema.properties, "legacy aliases remain supported");

  assert.equal((patternsFixture() as { patterns: unknown[] }).patterns.length, 6);
  assert.ok(analysisFixture());
  assert.ok(healthFixture().success);
  assert.ok(systemStatusFixture().success);
  assert.ok(predictionsFixture().success);
  assert.ok(classificationsFixture().success);
  assert.ok(clustersFixture().success);
});

test("TC-02: fetch mock serves contract envelope and FE service consumes canonical earthquake payload", async () => {
  const fixture = earthquakeFixture();
  const mock = createFetchMock({
    "/api/v1/earthquakes/1042": fixture,
    "/api/v1/earthquakes": successResponse([fixture], {
      total: 1,
      page: 1,
      limit: 20,
      total_pages: 1,
      last_updated: "2026-11-06T15:35:00Z",
    }),
  });

  try {
    const detail = await getEarthquakeDetail(1042);
    assert.equal(detail.source_event_id, fixture.source_event_id);

    const list = await getEarthquakes({ page: 1, limit: 20 });
    assert.equal(list.data[0].event_time, fixture.event_time);
    assert.ok(mock.requests.some(({ url }) => url.includes("/api/v1/earthquakes/1042")));
  } finally {
    mock.restore();
  }
});

test("TC-03: 404 means unavailable, while 500 remains an API error", async () => {
  const mock = createFetchMock({
    "/api/v1/not-implemented": errorResponse("RESOURCE_NOT_FOUND", "Not Found", 404),
    "/api/v1/broken": errorResponse("INTERNAL_SERVER_ERROR", "Server error", 500),
  });

  try {
    const unavailable = await getOptionalApi("/api/v1/not-implemented");
    assert.equal(unavailable.data, null);
    assert.equal(unavailable.unavailable, true);
    await assert.rejects(() => getOptionalApi("/api/v1/broken"), (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 500);
      assert.match(error.message, /Server error/u);
      return true;
    });
  } finally {
    mock.restore();
  }
});

test("TC-04: empty database fixture is an empty response, never static event fallback", async () => {
  const mock = createFetchMock({ "/api/v1/earthquakes": emptyResponse() });
  try {
    const list = await getEarthquakes();
    assert.deepEqual(list.data, []);
    assert.equal(list.metadata.total, 0);
  } finally {
    mock.restore();
  }
});

test("TC-05: sample timestamps use UTC Z and coordinates stay within WGS84", () => {
  const earthquake = earthquakeFixture();
  assertUtcWgs84(earthquake);

  const sse = sseEventFixture();
  assert.match(sse.timestamp, /Z$/u);
  assert.equal(sse.event, "earthquake_detected");
});

test("TC-06: EventSource mock emits contract event and supports demo clear/recovery sequence", () => {
  const sourceMock = installEventSourceMock();
  try {
    const source = new EventSource("http://localhost:8000/api/v1/stream/earthquakes") as unknown as {
      addEventListener: (type: string, listener: (event: MessageEvent<string>) => void) => void;
      open: () => void;
      emit: (event: ReturnType<typeof sseEventFixture>) => void;
      close: () => void;
      closed: boolean;
    };
    const received: Array<{ event: string; data: Record<string, unknown> }> = [];
    source.addEventListener("database_cleared", (message) => received.push(JSON.parse(message.data)));
    source.addEventListener("ingestion_cycle_completed", (message) => received.push(JSON.parse(message.data)));
    source.open();
    source.emit({ ...sseEventFixture(), event: "database_cleared", data: { records_deleted: 12 } });
    source.emit({
      ...sseEventFixture(),
      event: "ingestion_cycle_completed",
      data: { records_processed: 12 },
    });

    assert.deepEqual(received.map(({ event }) => event), ["database_cleared", "ingestion_cycle_completed"]);
    assert.equal(received[0].data.records_deleted, 12);
    assert.equal(received[1].data.records_processed, 12);
    source.close();
    assert.equal(source.closed, true);
  } finally {
    sourceMock.restore();
  }
});
