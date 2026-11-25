/** Test offline cho ranking Overview lấy từ catalog sự kiện thật (I5 — không mock). */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  rankFromCountryCatalog,
  rankFromRegionCatalog,
} from "../src/features/overview/overview-view.ts";

const src = resolve(import.meta.dirname, "../src");

test("TC-01: rankFromCountryCatalog trả RankRow trung thực", () => {
  const rows = rankFromCountryCatalog({
    success: true,
    data: [
      { country: "USA", count: 8142, avg_magnitude: 1.62, max_magnitude: 5.0 },
      { country: "Japan", count: 80, avg_magnitude: 2.1, max_magnitude: 4.3 },
    ],
  });
  assert.deepEqual(rows, [
    { key: "USA", label: "USA", eventCount: 8142, avgMagnitude: 1.62, maxMagnitude: 5.0, clusterIds: [] },
    { key: "Japan", label: "Japan", eventCount: 80, avgMagnitude: 2.1, maxMagnitude: 4.3, clusterIds: [] },
  ]);
});

test("TC-01b: chỉ lấy top N, sắp theo count giảm dần", () => {
  const data = Array.from({ length: 12 }, (_, i) => ({ country: `C${i}`, count: i + 1 }));
  const rows = rankFromCountryCatalog({ success: true, data });
  assert.equal(rows.length, 5);
  assert.deepEqual(
    rows.map((row) => row.key),
    ["C11", "C10", "C9", "C8", "C7"],
  );
  assert.equal(rankFromCountryCatalog({ success: true, data }, 10).length, 10);
});

test("TC-02: rankFromRegionCatalog & payload rỗng", () => {
  assert.deepEqual(
    rankFromRegionCatalog({ success: true, data: [{ region: "Honshu", count: 12 }] }).map((row) => row.key),
    ["Honshu"],
  );
  assert.deepEqual(rankFromCountryCatalog(null), []);
  assert.deepEqual(rankFromRegionCatalog({ success: true, data: [] }), []);
});

test("TC-03: OverviewPage ưu tiên ranking catalog, fallback cũ", () => {
  const page = readFileSync(resolve(src, "features/overview/OverviewPage.tsx"), "utf8");
  assert.match(page, /rankFromCountryCatalog\(data\.countryCatalog\)/u);
  assert.match(page, /rankFromRegionCatalog\(data\.regionCatalog\)/u);
  assert.match(page, /rankRegionsForCountry\(data\.clusters, country\)/u);
  const hook = readFileSync(resolve(src, "features/overview/useOverviewData.ts"), "utf8");
  assert.match(hook, /getCountryCatalog\(controller\.signal, window\)/u);
  assert.match(
    hook,
    /getRegionCatalog\(filter\?\.country \?\? undefined, controller\.signal, window\)/u,
  );
});
