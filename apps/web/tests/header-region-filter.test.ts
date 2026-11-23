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
import { regionOptionsFromCatalog } from "../src/layouts/header/header-data.ts";

const root = resolve(import.meta.dirname, "../src");

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
    { region: "Tokyo", count: 3 },
  ]);
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

test("TC-05: GlobalRegionFilter ghi ?region= và nằm trong HeaderActions", () => {
  const source = readFileSync(resolve(root, "layouts/header/GlobalRegionFilter.tsx"), "utf8");
  const actions = readFileSync(resolve(root, "layouts/header/HeaderActions.tsx"), "utf8");
  assert.match(source, /useCatalogSelection/u);
  assert.match(source, /setRegion/u);
  assert.match(source, /getRegionCatalog/u);
  assert.match(source, /ALL_COUNTRIES/u);
  assert.match(source, /ALL_REGIONS/u);
  assert.match(source, /aria-label="Lọc khu vực dùng chung toàn cục"/u);
  assert.match(actions, /<GlobalCountryFilter\s*\/>/u);
  assert.ok(
    actions.indexOf("<GlobalCountryFilter") < actions.indexOf("<GlobalRegionFilter"),
    "GlobalRegionFilter phải đứng sau GlobalCountryFilter",
  );
});
