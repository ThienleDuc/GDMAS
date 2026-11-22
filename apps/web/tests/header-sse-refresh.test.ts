/** Test offline GAP-13 — toast bắn theo SSE thật. node:test, không render React. */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolve } from "node:path";
import type { SSEEventPayload } from "../src/contracts/sse.ts";
import { dataRefreshKey } from "../src/layouts/header/header-data.ts";

const cycle = (timestamp: string): SSEEventPayload => ({
  event: "ingestion_cycle_completed",
  data: {},
  timestamp,
});

test("TC-01 — key từ event cycle", () => {
  assert.equal(dataRefreshKey(cycle("2026-11-22T03:00:00Z")), "2026-11-22T03:00:00Z:");
});

test("TC-02/03 — event khác → null; timestamp mới → key mới", () => {
  assert.equal(dataRefreshKey({ event: "heartbeat", data: {}, timestamp: "x" }), null);
  assert.equal(dataRefreshKey(null), null);
  assert.notEqual(
    dataRefreshKey(cycle("2026-11-22T03:00:00Z")),
    dataRefreshKey(cycle("2026-11-22T03:05:00Z")),
  );
});

test("TC-04/05 — wiring: shell truyền key, countdown không còn bắn toast", () => {
  const src = resolve(import.meta.dirname, "../src");
  const layout = readFileSync(resolve(src, "layouts/DashboardLayout.tsx"), "utf8");
  const actions = readFileSync(resolve(src, "layouts/header/HeaderActions.tsx"), "utf8");
  const label = readFileSync(resolve(src, "layouts/header/DataRefreshLabel.tsx"), "utf8");

  assert.match(layout, /dataRefreshKey=\{sseRefreshKey\}/u);
  assert.match(actions, /dataRefreshKey=\{dataRefreshKey\}/u);
  assert.match(label, /dataRefreshKey/u);
  assert.doesNotMatch(label, /setToastOpen\(true\)[\s\S]*onRefresh\(\)/u);
});
