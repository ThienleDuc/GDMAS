/**
 * Test offline cho bộ lọc khu vực dùng chung trên header.
 * .agents/notes/testcase/2026-11-23-earthquakes-filter-header-controls-thien.md — TC-04.
 * Không gọi mạng: payload là fixture cục bộ (I7).
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import type { RegionCatalogResponse } from "../src/contracts/geo-catalog.ts";
import { catalogFromSse, regionOptionsFromCatalog } from "../src/layouts/header/header-data.ts";

const root = resolve(import.meta.dirname, "../src");
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");

const PAYLOAD: RegionCatalogResponse = {
  success: true,
  data: [
    { region: "  Tokyo  ", count: 3 },
    { region: "Osaka", count: 2 },
    { region: "Tokyo", count: 1 },
    { region: "  ", count: 9 },
  ],
};

test("TC-04a: regionOptionsFromCatalog trim/bỏ rỗng/sort/gộp theo nhãn", () => {
  const options = regionOptionsFromCatalog(PAYLOAD);
  assert.deepEqual(options, [
    { region: "Osaka", count: 2 },
    { region: "Tokyo", count: 4 },
  ]);
});

test("TC-04c: dedupe theo casefold — mỗi khu vực chỉ 1 option", () => {
  const options = regionOptionsFromCatalog({
    success: true,
    data: [
      { region: "Honshu", count: 1 },
      { region: " honshu ", count: 2 },
      { region: "HONSHU", count: 3 },
    ],
  });
  assert.deepEqual(options, [{ region: "Honshu", count: 6 }]);
});

test("TC-04b: payload rỗng/sai shape trả [] — không fallback dữ liệu giả (I5)", () => {
  assert.deepEqual(regionOptionsFromCatalog(null), []);
  assert.deepEqual(regionOptionsFromCatalog(undefined), []);
  assert.deepEqual(regionOptionsFromCatalog({ success: true, data: [] }), []);
  assert.deepEqual(
    regionOptionsFromCatalog({ success: false, data: undefined as unknown as [] }),
    [],
  );
});

test("TC-06: catalogFromSse — có field thì đọc, thiếu thì null (giữ nguyên)", () => {
  const catalog = {
    countries: [{ country: "Japan", count: 3 }],
    regions: [{ region: "Tokyo", count: 2 }],
  };
  assert.deepEqual(
    catalogFromSse({ event: "ingestion_cycle_completed", timestamp: "2026-11-24T00:00:00Z", data: { catalog } }),
    catalog,
  );
  assert.equal(
    catalogFromSse({ event: "ingestion_cycle_completed", timestamp: "2026-11-24T00:00:00Z", data: {} }),
    null,
  );
  assert.equal(catalogFromSse(null), null);
});

test("TC-07: 2 filter nhận catalog prop, DashboardLayout truyền sse.data", () => {
  const country = read("layouts/header/GlobalCountryFilter.tsx");
  const region = read("layouts/header/GlobalRegionFilter.tsx");
  const actions = read("layouts/header/HeaderActions.tsx");
  const layout = read("layouts/DashboardLayout.tsx");
  assert.match(country, /catalog\?: HeaderCatalog/u);
  assert.match(region, /catalog\?: HeaderCatalog/u);
  assert.match(country, /if \(!catalog\) return;/u);
  assert.match(region, /if \(catalog\)/u);
  assert.match(actions, /catalogFromSse\(sseData\)/u);
  assert.match(layout, /sseData=\{sse\.data\}/u);
  // Fetch lần đầu cũng dùng cửa sổ tháng (không lấy dữ liệu 1 năm).
  assert.match(country, /getCountryCatalog\(controller\.signal, resolveWindow\("month"\)\)/u);
  assert.match(region, /getRegionCatalog\(country, controller\.signal, resolveWindow\("month"\)\)/u);
});

test("TC-05: GlobalRegionFilter ghi ?region= và nằm trong HeaderActions", () => {
  const source = readFileSync(resolve(root, "layouts/header/GlobalRegionFilter.tsx"), "utf8");
  const actions = readFileSync(resolve(root, "layouts/header/HeaderActions.tsx"), "utf8");
  assert.match(source, /useCatalogSelection/u);
  assert.match(source, /setRegion/u);
  assert.match(source, /getRegionCatalog/u);
  assert.match(source, /ALL_COUNTRIES/u);
  assert.match(source, /ALL_REGIONS/u);
  assert.match(source, /aria-label="Lọc khu vực dùng chung toàn cục"/u);
  assert.match(actions, /<GlobalCountryFilter catalog=/u);
  assert.ok(
    actions.indexOf("<GlobalCountryFilter") < actions.indexOf("<GlobalRegionFilter"),
    "GlobalRegionFilter phải đứng sau GlobalCountryFilter",
  );
});
