/** Test offline cho helper thuần múi giờ và context dùng chung (T7). */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  formatEventTime,
  timezoneFromStorage,
  timezoneToStorage,
} from "../src/utils/timezone.ts";

const root = resolve(import.meta.dirname, "..");
const read = (relative: string): string => readFileSync(resolve(root, relative), "utf8");

test("TC-01: không có mode lưu → mặc định UTC+7", () => {
  const store = new Map<string, string>();
  assert.equal(timezoneFromStorage((key) => store.get(key) ?? null), "UTC+7");
});

test("TC-02: đọc mode đã lưu từ storage", () => {
  const store = new Map<string, string>([["gdmas_timezone_mode", "UTC"]]);
  assert.equal(timezoneFromStorage((key) => store.get(key) ?? null), "UTC");
});

test("TC-03: ghi mode mới vào storage", () => {
  const store = new Map<string, string>();
  timezoneToStorage((key, value) => store.set(key, value), "UTC+7");
  assert.equal(store.get("gdmas_timezone_mode"), "UTC+7");
});

test("TC-04: cùng một mốc UTC cho 2 output khác nhau theo mode", () => {
  const iso = "2026-11-23T00:00:00Z";
  const utc = formatEventTime(iso, "UTC");
  const local = formatEventTime(iso, "UTC+7");
  assert.notEqual(utc, local);
  assert.ok(utc.length > 0 && local.length > 0);
});

test("TC-05: provider đọc/ghi qua helper cũ, hook báo lỗi ngoài provider", () => {
  const context = read("src/contexts/timezone-context.tsx");
  assert.match(context, /getStoredTimezone\(\)/u);
  assert.match(context, /setStoredTimezone\(mode\)/u);
  assert.match(context, /useTimezone phải được dùng trong/u);
  assert.match(context, /useMemo\(/u);

  const layout = read("src/layouts/DashboardLayout.tsx");
  // Provider phải bọc toàn shell, kể cả header chứa RealtimeClock/HeaderActions.
  assert.match(layout, /<TimezoneProvider>\s*<div className="layout layout--dashboard/u);
  assert.match(layout, /<TimezoneProvider>[\s\S]*<HeaderActions[\s\S]*<\/TimezoneProvider>/u);
  assert.doesNotMatch(layout, /<main[\s\S]{0,400}<TimezoneProvider/u);
});
