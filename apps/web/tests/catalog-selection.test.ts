/**
 * Test offline cho parse/serialize lựa chọn quốc gia/khu vực ↔ URL (Revision 2026-11-21).
 * TC-17 trong .agents/notes/testcase/2026-11-21-monitoring-leaflet-map-markers-thien.md
 */

import test from "node:test";
import assert from "node:assert/strict";
import { parseSelection, selectionToParams } from "../src/features/earthquakes/catalog-selection.ts";

test("TC-17: parse ?country=&region= (giữ param khác, lạ → all)", () => {
  assert.deepEqual(parseSelection(new URLSearchParams()), { country: "all", region: "all" });
  assert.deepEqual(parseSelection(new URLSearchParams("country=Japan&region=Honshu&page=2")), {
    country: "Japan",
    region: "Honshu",
  });
  assert.deepEqual(parseSelection(new URLSearchParams("country=&region=")), {
    country: "all",
    region: "all",
  });
});

test("TC-17: serialize ngược vào URL, xoá param khi về mặc định", () => {
  const original = new URLSearchParams("country=Japan&region=Honshu&page=2");
  const next = selectionToParams({ country: "all", region: "all" }, original);

  assert.equal(next.get("country"), null);
  assert.equal(next.get("region"), null);
  assert.equal(next.get("page"), "2");

  const selected = selectionToParams({ country: "Japan", region: "Honshu" });
  assert.equal(selected.get("country"), "Japan");
  assert.equal(selected.get("region"), "Honshu");
  assert.deepEqual(parseSelection(selected), { country: "Japan", region: "Honshu" });
});
