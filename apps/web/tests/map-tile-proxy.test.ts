/** Test offline cho tile cùng origin & bỏ combobox quốc gia trùng trên bản đồ. */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = resolve(import.meta.dirname, "../src");

test("TC-04: TILE_URL mặc định cùng origin (OSM), có thể override bằng env", () => {
  const map = readFileSync(resolve(src, "components/map/SeismicMap.tsx"), "utf8");
  assert.match(map, /resolveTileUrl\(import\.meta\.env\)/u);
  const tileUrl = readFileSync(resolve(src, "components/map/tile-url.ts"), "utf8");
  assert.match(tileUrl, /\/tile\/\{z\}\/\{x\}\/\{y\}\.png/u);
  assert.match(tileUrl, /VITE_MAP_TILE_URL/u);
  assert.match(tileUrl, /openstreetmap\.org\/copyright/u);
  assert.doesNotMatch(tileUrl, /cartocdn/u);
  assert.doesNotMatch(map, /import\.meta\.env\.DEV/u);
});

test("TC-05: vite.config proxy /tile → OSM DE cho cả dev lẫn preview", () => {
  const config = readFileSync(resolve(import.meta.dirname, "../vite.config.ts"), "utf8");
  assert.match(config, /const tileProxy/u);
  assert.match(config, /target:\s*["']https:\/\/tile\.openstreetmap\.de["']/u);
  assert.match(config, /from ["']node:https["']/u);
  assert.match(config, /family:\s*4/u); // Docker không ra IPv6 → ép IPv4
  assert.match(config, /rewrite:/u);
  assert.match(config, /preview:\s*\{/u);
  assert.equal((config.match(/["']\/tile["']\s*:\s*tileProxy/gu) ?? []).length, 2);

  const docker = readFileSync(resolve(import.meta.dirname, "../Dockerfile"), "utf8");
  assert.match(docker, /proxy_pass https:\/\/tile\.openstreetmap\.de\//u);
  assert.doesNotMatch(docker, /cartocdn/u);
});

test("TC-06: proxy /api thân thiện với SSE (không timeout)", () => {
  const config = readFileSync(resolve(import.meta.dirname, "../vite.config.ts"), "utf8");
  assert.match(config, /["']\/api["']\s*:\s*\{/u);
  assert.match(config, /proxyTimeout:\s*0/u);
  assert.match(config, /timeout:\s*0/u);
});

test("TC-06: quốc gia chỉ lọc ở header, trong trang không có combobox", () => {
  const panel = readFileSync(resolve(src, "components/map/MapRegionPanel.tsx"), "utf8");
  assert.doesNotMatch(panel, /gm-country-combo/u);
  assert.doesNotMatch(panel, /role="combobox"/u);
  assert.doesNotMatch(panel, /countryQuery|countryOpen|gm-region-country/u);

  const page = readFileSync(resolve(src, "features/monitoring/MonitoringMapPage.tsx"), "utf8");
  assert.doesNotMatch(page, /onCountryChange=\{setCountry\}/u);
  assert.doesNotMatch(page, /gm-region-country/u);
  assert.match(page, /useCatalogSelection\(\)/u);
  assert.match(page, /<EventListPanel/u);
});
