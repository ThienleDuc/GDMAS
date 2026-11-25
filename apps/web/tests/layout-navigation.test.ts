/**
 * Test offline cho cấu hình điều hướng shell (layout refactor 2026-11-21).
 * TC-01, TC-02 trong .agents/notes/testcase/2026-11-21-layout-aside-hover-thien.md
 */

import test from "node:test";
import assert from "node:assert/strict";
import { NAV_META, navMetaFor, routeLabel } from "../src/layouts/navigation.ts";

test("TC-01: routeLabel trả nhãn tiếng Việt cho 6 route + fallback", () => {
  assert.equal(routeLabel("/"), "Tổng quan");
  assert.equal(routeLabel("/monitoring"), "Bản đồ Giám sát");
  assert.equal(routeLabel("/earthquakes"), "Danh mục Động đất");
  assert.equal(routeLabel("/statistics"), "6 nhóm phân tích");

  // 2 route placeholder đã bị gỡ — fallback "Trang", không trả slug tiếng Anh.
  assert.equal(routeLabel("/reports"), "Trang");
  assert.equal(routeLabel("/settings"), "Trang");
  assert.equal(navMetaFor("/reports"), null);
  assert.equal(navMetaFor("/settings"), null);

  // Route lạ / route con — không trả slug tiếng Anh.
  assert.equal(routeLabel("/khong-ton-tai"), "Trang");
  assert.equal(routeLabel("/monitoring/chi-tiet"), "Bản đồ Giám sát");
  assert.equal(routeLabel("/"), "Tổng quan");
  assert.equal(routeLabel("///"), "Tổng quan");
});

test("TC-02: navMetaFor trả đủ nhãn, mô tả và badge", () => {
  assert.deepEqual(
    NAV_META.map((item) => item.path),
    ["/", "/monitoring", "/earthquakes", "/statistics"],
  );

  const meta = navMetaFor("/monitoring");
  assert.ok(meta);
  assert.equal(meta.label, "Bản đồ Giám sát");
  assert.ok(meta.description.length > 0);
  assert.equal(meta.badge, "Trực tiếp");

  assert.ok(navMetaFor("/")?.label === "Tổng quan");
  assert.equal(navMetaFor("/khong-ton-tai"), null);
});
