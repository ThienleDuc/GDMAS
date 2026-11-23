/** Test offline cho biểu đồ cao điểm theo tháng (bổ sung 2026-11-23). */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  applyMonthWindow,
  applyWeekdayWindow,
  buildMonthlyBars,
  padWeekdaysTo7,
} from "../src/features/overview/overview-view.ts";
import { getMonthlyPeaks, getSeasonalityAnalysis } from "../src/services/earthquake-api.ts";

const src = resolve(import.meta.dirname, "../src");
const read = (path: string): string => readFileSync(resolve(src, path), "utf8");

function captureUrls(payload: unknown): { urls: string[]; restore: () => void } {
  const urls: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL) => {
    urls.push(String(input));
    return new Response(JSON.stringify(payload), { status: 200 });
  };
  return { urls, restore: () => { globalThis.fetch = originalFetch; } };
}

test("TC-01: buildMonthlyBars tính hệ số so với trung bình", () => {
  const bars = buildMonthlyBars({
    success: true,
    data: [
      { month: 1, label: "Tháng 1", count: 6 },
      { month: 2, label: "Tháng 2", count: 2 },
      { month: 3, label: "Tháng 3", count: 0 },
    ],
  });
  assert.equal(bars.length, 12); // luôn 12 cột để so sánh
  assert.deepEqual(bars.slice(0, 3).map((bar) => bar.factor), [1.5, 0.5, 0]);
  assert.equal(bars[0].position, "above");
  assert.equal(bars[1].position, "below");
  assert.ok(bars.slice(3).every((bar) => bar.factor === 0 && bar.position === "below"));
});

test("TC-02: payload rỗng → 12 cột hệ số 0 (không bịa số)", () => {
  for (const bars of [
    buildMonthlyBars(null),
    buildMonthlyBars({ success: true, data: [] }),
  ]) {
    assert.equal(bars.length, 12);
    assert.ok(bars.every((bar) => bar.factor === 0));
  }
});

test("TC-02b: biểu đồ tuần luôn 7 cột, ngày thiếu hệ số 0", () => {
  const rows = padWeekdaysTo7([
    { label: "Thứ 2", factor: 1.4, position: "above" },
  ]);
  assert.equal(rows.length, 7);
  assert.equal(rows[0].factor, 1.4);
  assert.ok(rows.slice(1).every((row) => row.factor === 0));
});

test("TC-02c: cột ngoài phạm vi hiện tại hạ về 0 nhưng vẫn đủ số cột", () => {
  const week = padWeekdaysTo7([
    { label: "Thứ 2", factor: 1.4, position: "above" },
  ]);
  // Chủ nhật (2026-11-22) → thứ 7 index 6; day chỉ giữ index 6 (không có số liệu → 0)
  const day = applyWeekdayWindow(week, "day", new Date("2026-11-22T00:00:00Z"));
  assert.equal(day.length, 7);
  assert.ok(day.every((row) => row.factor === 0));

  const month = applyMonthWindow(
    buildMonthlyBars({
      success: true,
      data: Array.from({ length: 11 }, (_, i) => ({
        month: i + 1,
        label: `Tháng ${i + 1}`,
        count: 10,
      })),
    }),
    new Date("2026-11-15T00:00:00Z"),
  );
  assert.equal(month.length, 12);
  assert.ok(month.slice(0, 11).every((row) => row.factor > 0));
  assert.equal(month[11].factor, 0); // tháng 12 chưa có → 0
});

test("TC-03: service gọi đúng endpoint + interval", async () => {
  const empty = { success: true, data: [] };
  const { urls, restore } = captureUrls(empty);
  try {
    await getMonthlyPeaks({ country: "Japan" });
    await getSeasonalityAnalysis({ country: "Japan", interval: "month" });
  } finally {
    restore();
  }
  assert.equal(new URL(urls[0]).pathname, "/api/v1/statistics/monthly-peaks");
  assert.equal(new URL(urls[0]).searchParams.get("country"), "Japan");
  assert.equal(new URL(urls[1]).searchParams.get("interval"), "month");
});

test("TC-04: Overview render biểu đồ tháng bên dưới biểu đồ tuần", () => {
  const page = read("features/overview/OverviewPage.tsx");
  const weekIndex = page.indexOf("<OverviewSeasonalityChart data={seasonality} />");
  const monthIndex = page.indexOf("<OverviewSeasonalityChart data={monthlyBars} />");
  assert.ok(weekIndex > 0 && monthIndex > weekIndex, "biểu đồ tháng phải nằm sau biểu đồ tuần");
  assert.match(page, /Cao điểm theo tháng/u);
  const hook = read("features/overview/useOverviewData.ts");
  assert.match(hook, /getMonthlyPeaks\(filter, controller\.signal\)/u);
  // Bỏ request seasonality?interval=month vô dụng (phase-load 2026-11-23).
  assert.doesNotMatch(hook, /interval: "month"/u);
});
