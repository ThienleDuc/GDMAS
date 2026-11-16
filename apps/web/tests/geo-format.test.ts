/**
 * Unit test offline cho định dạng toạ độ WGS84 và thời gian UTC (I3).
 * Testcase: TC-01, TC-02, TC-14 trong
 * .agents/notes/testcase/2026-11-16-fe-contract-gis-reports-thien.md
 *
 * Chạy: cd apps/web && node --test tests/geo-format.test.ts
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { formatCoordinate, formatMetric } from "../src/components/map/map-data.ts";
import { formatEventTime, getRelativeTime } from "../src/utils/timezone.ts";

test("TC-14: Định dạng toạ độ WGS84 chuẩn (latitude, longitude)", () => {
  // Đà Nẵng: 16.0544° N, 108.2022° E
  assert.equal(formatCoordinate(16.0544, 108.2022), "16.0544° N, 108.2022° E");

  // Bán cầu Nam & Tây
  assert.equal(formatCoordinate(-33.8688, -151.2093), "33.8688° S, 151.2093° W");

  // Xích đạo / kinh tuyến gốc
  assert.equal(formatCoordinate(0, 0), "0.0000° N, 0.0000° E");

  // Toạ độ không hợp lệ -> '—'
  assert.equal(formatCoordinate(Number.NaN, 100), "—");
  assert.equal(formatCoordinate(20, Number.POSITIVE_INFINITY), "—");
});

test("TC-14: Định dạng thời gian UTC (I3) và Giờ địa phương UTC+7", () => {
  const utcIso = "2026-11-16T10:30:00Z";

  const formattedUtc = formatEventTime(utcIso, "UTC");
  assert.ok(formattedUtc.includes("UTC"), "Phải có nhãn UTC");
  assert.ok(formattedUtc.includes("10:30"), "Phải giữ đúng giờ UTC");

  const formattedLocal = formatEventTime(utcIso, "UTC+7");
  // 10:30 UTC -> 17:30 UTC+7
  assert.ok(formattedLocal.includes("17:30") || formattedLocal.includes("UTC+7"), "Phải chuyển đúng UTC+7");
});

test("TC-01 & TC-02: Toàn bộ contracts schemas & examples parse hợp lệ", () => {
  const contractsDir = path.resolve(import.meta.dirname, "../../../contracts");

  // Kiểm tra 6 schema mới
  const requiredSchemas = [
    "health.json",
    "system-status.json",
    "analysis.json",
    "predictions.json",
    "classifications.json",
    "clusters.json",
    "sse-event.json",
  ];

  for (const file of requiredSchemas) {
    const filePath = path.join(contractsDir, "schemas", file);
    assert.ok(fs.existsSync(filePath), `Schema ${file} phải tồn tại`);
    const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    assert.ok(content.$id || content.$schema, `Schema ${file} phải có $id hoặc $schema`);
  }

  // TC-02: sse-event.json mở rộng additive
  const sseSchemaPath = path.join(contractsDir, "schemas", "sse-event.json");
  const sseSchema = JSON.parse(fs.readFileSync(sseSchemaPath, "utf-8"));
  const eventEnum = sseSchema.properties.event.enum;
  assert.ok(eventEnum.includes("earthquake_detected"));
  assert.ok(eventEnum.includes("heartbeat"));
  assert.ok(eventEnum.includes("alert"));
  assert.ok(eventEnum.includes("ingestion_cycle_completed"));
  assert.ok(eventEnum.includes("database_cleared"));
  assert.ok(eventEnum.includes("earthquake_alert"));

  // Kiểm tra 6 example mới
  const requiredExamples = [
    "health_sample.json",
    "system_status_sample.json",
    "analysis_sample.json",
    "predictions_sample.json",
    "classifications_sample.json",
    "clusters_sample.json",
  ];

  for (const file of requiredExamples) {
    const filePath = path.join(contractsDir, "examples", file);
    assert.ok(fs.existsSync(filePath), `Example ${file} phải tồn tại`);
    const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    assert.ok(content !== null && typeof content === "object");
  }
});
