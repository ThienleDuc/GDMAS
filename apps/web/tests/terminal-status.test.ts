/**
 * Test offline cho panel trạng thái 7 Terminals (RD-16).
 * Helper thuần + source assertion — không render React (không có jsdom).
 * Chạy: cd apps/web && node --test tests/terminal-status.test.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolve } from "node:path";
import type { SystemStatusResponse } from "../src/contracts/system-status.ts";
import {
  summarizeTerminalRows,
  terminalStatusLabel,
  terminalStatusRows,
} from "../src/layouts/header/header-data.ts";

const NOW = new Date("2026-11-22T12:00:00Z");

const PAYLOAD: SystemStatusResponse = {
  success: true,
  data: {
    services: {
      postgres: { status: "running" },
      ingestion: { status: "active", last_run: "2026-11-22T11:55:00Z", cycle: "5m" },
      analysis: { status: "active", last_run: "2026-11-22T11:44:00Z", cycle: "5m" },
      clustering: { status: "active", last_run: "2026-11-20T06:00:00Z", cycle: "1d" },
      prediction: { status: "error", last_run: "2026-11-22T11:58:00Z", cycle: "5m" },
      api: { status: "active", uptime_seconds: 120 },
      frontend: { status: "active" },
    },
    data_feed: { source: "USGS", total_events: 100 },
  },
};

test("TC-01 — đủ 7 dòng T1…T7 với nhãn từ contract", () => {
  const rows = terminalStatusRows(PAYLOAD, NOW);

  assert.equal(rows.length, 7);
  assert.deepEqual(
    rows.map((row) => row.terminalId),
    ["T1", "T2", "T3", "T4", "T5", "T6", "T7"],
  );
  assert.equal(rows[0].name, "PostgreSQL");
  assert.equal(rows[6].name, "Frontend");
});

test("TC-02 — thiếu last_run → unknown, không suy diễn đang chạy", () => {
  const rows = terminalStatusRows(PAYLOAD, NOW);
  const postgres = rows[0];

  assert.equal(postgres.status, "running");
  assert.equal(postgres.freshness, "unknown");
  assert.equal(postgres.lastRunLabel, "—");
  assert.equal(postgres.freshnessLabel, "Chưa có thông tin");
});

test("TC-03/04 — stale 5m và interrupted 1d", () => {
  const rows = terminalStatusRows(PAYLOAD, NOW);
  const analysis = rows.find((row) => row.key === "analysis");
  const clustering = rows.find((row) => row.key === "clustering");

  assert.equal(analysis?.freshness, "stale");
  assert.equal(clustering?.freshness, "interrupted");
});

test("TC-05 — summary chỉ đếm active/running + fresh", () => {
  const rows = terminalStatusRows(PAYLOAD, NOW);
  assert.deepEqual(summarizeTerminalRows(rows), { healthy: 1, total: 7 });
});

test("TC-06 — payload rỗng → 7 dòng unknown, không crash", () => {
  const rows = terminalStatusRows(null, NOW);
  assert.equal(rows.length, 7);
  assert.ok(rows.every((row) => row.status === "unknown" && row.freshness === "unknown"));
  assert.deepEqual(summarizeTerminalRows(rows), { healthy: 0, total: 7 });
});

test("TC-09 — nhãn trạng thái tiếng Việt, status lạ → unknown", () => {
  assert.equal(terminalStatusLabel("active"), "Hoạt động");
  assert.equal(terminalStatusLabel("error"), "Lỗi");
  assert.equal(terminalStatusLabel("unknown"), "Không xác định");
});

test("TC-07 — header wiring giữ thứ tự Clock trước Theme", () => {
  const sourceRoot = resolve(import.meta.dirname, "../src");
  const actions = readFileSync(resolve(sourceRoot, "layouts/header/HeaderActions.tsx"), "utf8");

  assert.match(actions, /<SystemStatusPanel\s*\/>/u);
  assert.ok(
    actions.indexOf("<RealtimeClock") < actions.indexOf("<ThemeToggle"),
    "ThemeToggle phải đứng sau RealtimeClock",
  );
});

test("TC-08 — không khôi phục /settings hay strip 7 Terminals trên Overview", () => {
  const sourceRoot = resolve(import.meta.dirname, "../src");
  const routes = readFileSync(resolve(sourceRoot, "app/routes.tsx"), "utf8");
  const overview = readFileSync(resolve(sourceRoot, "features/overview/OverviewPage.tsx"), "utf8");

  assert.doesNotMatch(routes, /APP_ROUTES\.SETTINGS/u);
  assert.doesNotMatch(overview, /buildTerminalRows|ov-card--12/u);
});
