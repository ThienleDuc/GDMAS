/** Test offline: mọi page được lazy-load theo route (giảm bundle ban đầu). */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const app = readFileSync(resolve(import.meta.dirname, "../src/app/App.tsx"), "utf8");

test("TC-01: cả 4 page dùng React.lazy + dynamic import", () => {
  const pages = [
    ["OverviewPage", "features/overview/OverviewPage"],
    ["MonitoringMapPage", "features/monitoring/MonitoringMapPage"],
    ["EarthquakesPage", "features/earthquakes/EarthquakesPage"],
    ["StatisticsRoutes", "features/statistics/StatisticsRoutes"],
  ] as const;
  for (const [name, modulePath] of pages) {
    assert.match(app, new RegExp(`const ${name} = React\\.lazy\\(`, "u"), `${name} chưa lazy`);
    assert.match(app, new RegExp(`import\\(["']\\.\\./${modulePath}`, "u"), `${name} chưa dynamic import`);
  }
  assert.doesNotMatch(app, /import \{ (EarthquakesPage|MonitoringMapPage) \}/u);
});

test("TC-02: mỗi route có Suspense fallback", () => {
  assert.equal((app.match(/<React\.Suspense/gu) ?? []).length, 4);
  assert.match(app, /PlaceholderPage title="Bản đồ giám sát"/u);
  assert.match(app, /PlaceholderPage title="Danh mục động đất"/u);
});
