/** Test offline cho tile cùng origin & bỏ combobox quốc gia trùng trên bản đồ. */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = resolve(import.meta.dirname, "../src");

test("TC-04: TILE_URL dùng /tile ở dev, tuyệt đối ở prod", () => {
  const map = readFileSync(resolve(src, "components/map/SeismicMap.tsx"), "utf8");
  assert.match(map, /import\.meta\.env\.DEV/u);
  assert.match(map, /\/tile\/dark_all\/\{z\}\/\{x\}\/\{y\}\{r\}\.png/u);
  assert.match(map, /basemaps\.cartocdn\.com/u);
});

test("TC-05: vite.config proxy /tile → CARTO", () => {
  const config = readFileSync(resolve(import.meta.dirname, "../vite.config.ts"), "utf8");
  assert.match(config, /["']\/tile["']\s*:\s*\{/u);
  assert.match(config, /target:\s*["']https:\/\/a\.basemaps\.cartocdn\.com["']/u);
  assert.match(config, /rewrite:/u);
});

test("TC-06: MapRegionPanel không còn combobox quốc gia", () => {
  const panel = readFileSync(resolve(src, "components/map/MapRegionPanel.tsx"), "utf8");
  assert.doesNotMatch(panel, /gm-country-combo/u);
  assert.doesNotMatch(panel, /role="combobox"/u);
  assert.doesNotMatch(panel, /countryQuery|countryOpen/u);
  const page = readFileSync(resolve(src, "features/monitoring/MonitoringMapPage.tsx"), "utf8");
  assert.doesNotMatch(page, /onCountryChange=\{handleCountryChange\}/u);
  assert.match(page, /country=\{country\}/u);
});
