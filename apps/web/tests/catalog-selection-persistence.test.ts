/**
 * Test offline — giữ lựa chọn quốc gia/khu vực khi chuyển trang & sau refresh 5 phút.
 * testcase: 2026-11-24-catalog-selection-persistence-thien. Không mạng, không DOM (I7).
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { parseSelection, pathWithSelection } from "../src/features/earthquakes/catalog-selection.ts";

const root = resolve(import.meta.dirname, "../src");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");

test("TC-01: pathWithSelection nối quốc gia/khu vực vào link nội bộ", () => {
  assert.equal(
    pathWithSelection("/monitoring", { country: "Japan", region: "Tokyo" }),
    "/monitoring?country=Japan&region=Tokyo",
  );
  assert.equal(pathWithSelection("/earthquakes", { country: "Japan", region: "all" }), "/earthquakes?country=Japan");
});

test("TC-02: về 'all' xoá param, giữ query/hash khác, không nhân đôi", () => {
  const all = { country: "all", region: "all" };
  assert.equal(pathWithSelection("/overview", all), "/overview");
  assert.equal(
    pathWithSelection("/overview?range=week#top", all),
    "/overview?range=week#top",
  );
  assert.equal(
    pathWithSelection("/overview?country=USA&range=month", { country: "Japan", region: "all" }),
    "/overview?country=Japan&range=month",
  );
  assert.deepEqual(
    parseSelection(new URLSearchParams("?country=Japan&region=Tokyo")),
    { country: "Japan", region: "Tokyo" },
  );
});

test("TC-03: useCatalogSelection trả method withSelection", () => {
  const source = read("features/earthquakes/useCatalogSelection.ts");
  assert.match(source, /withSelection:\s*\(to:\s*string\)\s*=>\s*string/u);
  assert.match(source, /pathWithSelection/u);
});

test("TC-04: mọi điều hướng nội bộ dùng helper giữ selection", () => {
  const layout = read("layouts/DashboardLayout.tsx");
  const overview = read("features/overview/OverviewPage.tsx");
  const statistics = read("features/statistics/StatisticsLayout.tsx");

  assert.match(layout, /to=\{withSelection\(item\.path\)\}/u);
  assert.match(overview, /withSelection\(APP_ROUTES\.MONITORING\)/u);
  assert.match(overview, /withSelection\(APP_ROUTES\.STATISTICS\)/u);
  assert.match(overview, /withSelection\(APP_ROUTES\.EARTHQUAKES\)/u);
  // handleRankSelect dùng selection mới (tránh stale closure).
  assert.match(overview, /navigate\(pathWithSelection\(APP_ROUTES\.MONITORING, \{ country: nextCountry, region: nextRegion \}\)\)/u);
  assert.match(statistics, /withSelection\(patternPath\(item\.slug\)\)/u);
  assert.doesNotMatch(overview, /navigate\(APP_ROUTES\.MONITORING\)/u);
});

test("TC-05: refresh 5 phút refetch theo filter hiện tại", () => {
  const overview = read("features/overview/OverviewPage.tsx");
  assert.match(
    overview,
    /useOverviewData\(\{ country, region \}, dbReset\.refreshVersion, window\)/u,
  );
  assert.doesNotMatch(overview, /useOverviewData\(\{ country:\s*"all"/u);
});
