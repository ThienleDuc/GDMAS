/** Kiểm tra mọi nơi hiển thị thời gian dùng chung chế độ từ context (I2/I3). */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (relative: string): string => readFileSync(resolve(root, relative), "utf8");

test("TC-06: header toggle dùng context thay state nội bộ", () => {
  const clock = read("src/layouts/header/RealtimeClock.tsx");
  assert.match(clock, /useTimezone\(\)/u);
  assert.doesNotMatch(clock, /getStoredTimezone|setStoredTimezone/u);
  assert.match(clock, /setTimezone\(next\)/u);
});

test("TC-07: Overview & Danh mục dùng useTimezone, không snapshot localStorage", () => {
  const overview = read("src/features/overview/OverviewPage.tsx");
  assert.match(overview, /const \{ timezone \} = useTimezone\(\)/u);
  assert.doesNotMatch(overview, /getStoredTimezone/u);

  const earthquakes = read("src/features/earthquakes/EarthquakesPage.tsx");
  assert.match(earthquakes, /const \{ timezone \} = useTimezone\(\)/u);
  assert.doesNotMatch(earthquakes, /getStoredTimezone/u);
});

test("TC-08: Bản đồ (danh sách + popup) không hardcode UTC", () => {
  const list = read("src/components/map/EventListPanel.tsx");
  assert.match(list, /useTimezone\(\)/u);
  assert.match(list, /formatEventTime\(event\.eventTime, timezone\)/u);
  assert.doesNotMatch(list, /"UTC"/u);

  const popup = read("src/components/map/MapPopupCard.tsx");
  assert.match(popup, /useTimezone\(\)/u);
  assert.match(popup, /popupFields\(event, timezone\)/u);
});

test("TC-09: giữ default UTC trên hàm thuần cho caller cũ (I2)", () => {
  const view = read("src/features/monitoring/monitoring-view.ts");
  assert.match(view, /popupFields\(event: MapEarthquake, mode: TimezoneMode = "UTC"\)/u);

  const row = read("src/features/earthquakes/earthquake-view.ts");
  assert.match(row, /mode: TimezoneMode = "UTC"/u);

  const detail = read("src/features/earthquakes/earthquake-detail.ts");
  assert.match(detail, /timezone: TimezoneMode = "UTC"/u);
});
