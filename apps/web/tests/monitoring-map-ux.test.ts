/**
 * Test offline (source-inspection) cho 4 fix UX trang Bản đồ giám sát:
 * z-index dropdown header, lọc quốc gia trong page, bản đồ thế giới offline, fit chiều cao.
 * Chạy: cd apps/web && node --test tests/monitoring-map-ux.test.ts
 */

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (relative: string): string => readFileSync(resolve(root, relative), "utf8");

test("TC-08: dropdown quốc gia header nằm trên mọi pane bản đồ", () => {
  const tokens = read("src/styles/globals.css");
  assert.match(tokens, /--z-header:\s*1500/u);
  assert.match(tokens, /--z-header-popover:\s*1600/u);

  const layout = read("src/layouts/layout.css");
  assert.match(layout, /\.layout__header\s*\{[\s\S]*?z-index:\s*var\(--z-header\)/u);
  assert.match(layout, /\.layout__country-dropdown\s*\{[\s\S]*?z-index:\s*var\(--z-header-popover\)/u);
});

test("TC-09: quốc gia lọc ở header; trong trang là danh sách sự kiện kiểu USGS", () => {
  const panel = read("src/components/map/EventListPanel.tsx");
  assert.match(panel, /gm-event-item__magnitude/u);
  assert.match(panel, /gm-event-item__place/u);
  assert.match(panel, /gm-event-item__depth/u);
  assert.match(panel, /M\{event\.magnitude\.toFixed\(1\)\}/u);
  assert.match(panel, /\{event\.depthKm\.toFixed\(1\)\} km/u);

  const page = read("src/features/monitoring/MonitoringMapPage.tsx");
  assert.doesNotMatch(page, /gm-region-country/u);
  assert.doesNotMatch(page, /onCountryChange/u);
  assert.match(page, /const \{ country, region \} = useCatalogSelection\(\)/u);
  assert.match(page, /<EventListPanel/u);
});

test("TC-10: bản đồ thế giới local hiển thị offline khi tile lỗi", () => {
  const assetPath = resolve(root, "public/world-countries.geo.json");
  assert.ok(existsSync(assetPath), "thiếu public/world-countries.geo.json");
  const world = JSON.parse(read("public/world-countries.geo.json")) as {
    type: string;
    features: unknown[];
  };
  assert.equal(world.type, "FeatureCollection");
  assert.ok(world.features.length > 100, "world GeoJSON quá ít quốc gia");

  const layer = read("src/components/map/WorldFallbackLayer.tsx");
  assert.match(layer, /world-countries\.geo\.json/u);
  assert.match(layer, /zIndex\s*=\s*"150"/u); // dưới tilePane (200)
  assert.match(layer, /interactive=\{false\}/u);
  assert.match(layer, /enabled = false/u); // không tải khi tile tốt
  assert.match(layer, /cachedWorld/u); // cache promise, không tải lại khi vào lại trang

  const map = read("src/components/map/SeismicMap.tsx");
  assert.match(map, /<WorldFallbackLayer enabled=\{tileFailed\} \/>/u);
  assert.match(map, /errorTileUrl=\{TRANSPARENT_TILE\}/u);
  assert.match(map, /map\.fitWorld\(\{ animate: false \}\)/u);
});

test("TC-11: chưa chọn gì thì hiện thế giới; lọc country/region đẩy xuống BE, realtime", () => {
  const page = read("src/features/monitoring/MonitoringMapPage.tsx");
  assert.match(page, /latitude:\s*15,\s*longitude:\s*0,\s*zoom:\s*2/u);
  assert.match(page, /country !== ALL_COUNTRIES \|\| region !== ALL_REGIONS/u);
  assert.match(
    page,
    /buildEarthquakeQuery\(filters,\s*null,\s*\{ country, region, realtime: true \}\)/u,
  );
  assert.doesNotMatch(page, /viewportToBbox/u);

  const view = read("src/features/monitoring/monitoring-view.ts");
  assert.match(view, /params\.country = options\.country/u);
  assert.match(view, /params\.region = options\.region/u);
  assert.match(view, /if \(!options\.realtime\)/u);
});

test("TC-12: panel + bản đồ lấp đúng chiều cao còn lại, không scroll page", () => {
  const layout = read("src/layouts/layout.css");
  assert.match(layout, /\.layout__content--map\s*\{[\s\S]*?overflow:\s*hidden/u);

  const shell = read("src/layouts/DashboardLayout.tsx");
  assert.match(shell, /layout__content--map/u);

  const css = read("src/features/monitoring/monitoring.css");
  assert.match(css, /\.gm-page\s*\{[\s\S]*?height:\s*100%/u);
  assert.match(css, /\.gm-map\s*\{[\s\S]*?height:\s*100%/u);
  assert.doesNotMatch(css, /72vh/u);
});

test("TC-13: nền bản đồ sáng, chữ popup tối dễ đọc", () => {
  const css = read("src/features/monitoring/monitoring.css");
  assert.doesNotMatch(css, /filter:\s*invert\(1\)/u);
  assert.match(css, /\.gm-map\s*\{[\s\S]*?background:\s*#f8fafc/u);
  assert.match(css, /\.gm-popup\s*\{[\s\S]*?color:\s*#0f172a/u);
  assert.match(css, /\.gm-popup__grid dt\s*\{[\s\S]*?color:\s*#475569/u);

  const map = read("src/components/map/SeismicMap.tsx");
  assert.match(map, /background:\s*"#f8fafc"/u);

  const fallback = read("src/components/map/WorldFallbackLayer.tsx");
  assert.match(fallback, /fillColor:\s*"#e2e8f0"/u);
});

test("TC-14: thông báo rỗng phân biệt DB trống và khu vực không có sự kiện", () => {
  const overlay = read("src/components/map/MapEmptyOverlay.tsx");
  assert.match(overlay, /hasEvents/u);
  assert.match(overlay, /Cơ sở dữ liệu đang rỗng — bản đồ vẫn sẵn sàng nhận dữ liệu mới/u);
  assert.match(overlay, /Không có sự kiện trong khu vực đang chọn — bản đồ vẫn sẵn sàng nhận dữ liệu mới/u);

  const page = read("src/features/monitoring/MonitoringMapPage.tsx");
  assert.match(page, /<MapEmptyOverlay hasEvents=\{events\.length > 0\} \/>/u);
});

test("TC-15: tối ưu tốc độ tải — tile theo idle, fallback on-demand, ít request hơn", () => {
  const map = read("src/components/map/SeismicMap.tsx");
  assert.match(map, /updateWhenIdle/u);
  assert.match(map, /updateWhenZooming=\{false\}/u);
  assert.match(map, /keepBuffer=\{2\}/u);

  // Không còn request /clusters và /regions riêng trong page (lọc đã xuống BE).
  const page = read("src/features/monitoring/MonitoringMapPage.tsx");
  assert.doesNotMatch(page, /fetchRegionClusters/u);
  assert.doesNotMatch(page, /getRegionCatalog/u);
});

test("TC-20: item 3 phần có gap cố định, 1&3 theo nội dung, 2 lấy phần còn lại", () => {
  const panel = read("src/components/map/EventListPanel.tsx");
  assert.match(panel, /gm-event-item__main/u);
  assert.match(panel, /formatEventTime\(event\.eventTime, "UTC"\)/u);
  assert.match(panel, /M\{event\.magnitude\.toFixed\(1\)\}/u);
  assert.match(panel, /\{event\.depthKm\.toFixed\(1\)\} km/u);

  const css = read("src/features/monitoring/monitoring.css");
  assert.match(css, /\.gm-event-item\s*\{[\s\S]*?gap:\s*var\(--space-3\)/u);
  assert.match(css, /\.gm-event-item__magnitude\s*\{[\s\S]*?flex:\s*0 0 auto/u);
  assert.match(css, /\.gm-event-item__main\s*\{[\s\S]*?flex:\s*1;/u);
  assert.match(css, /\.gm-event-item__depth\s*\{[\s\S]*?flex:\s*0 0 auto/u);
  assert.match(css, /border-left:\s*2px solid transparent/u);
  assert.match(css, /\.gm-event-item\s*\{[\s\S]*?min-height:\s*58px/u);

  // Trang realtime không còn bộ lọc (giữ file component cũ theo I2).
  const page = read("src/features/monitoring/MonitoringMapPage.tsx");
  assert.doesNotMatch(page, /<MapControlsPanel/u);
  assert.doesNotMatch(page, /onApply/u);
});

test("TC-21: ngưỡng độ lớn lấy từ BACKFILL_MIN_MAGNITUDE, bỏ bộ lọc", () => {
  const view = read("src/features/monitoring/monitoring-view.ts");
  assert.match(view, /VITE_MAP_MIN_MAGNITUDE/u);
  assert.match(view, /resolveMapMinMagnitude/u);
  assert.match(view, /DEFAULT_MIN_MAGNITUDE = 2\.5/u);

  const compose = read("../../docker-compose.yml");
  assert.match(compose, /VITE_MAP_MIN_MAGNITUDE: \$\{BACKFILL_MIN_MAGNITUDE/u);

  const page = read("src/features/monitoring/MonitoringMapPage.tsx");
  assert.match(page, /resolveMapMinMagnitude\(import\.meta\.env\)/u);
  assert.match(page, /minMagnitude: MAP_MIN_MAGNITUDE/u);
  assert.doesNotMatch(page, /<MapControlsPanel/u);
});

test("TC-25: danh sách & query sắp theo thời gian mới nhất", () => {
  const view = read("src/features/monitoring/monitoring-view.ts");
  assert.match(view, /sort_by: "event_time"/u);
  assert.match(view, /export function sortEventsByTimeDesc/u);
  assert.match(view, /Number\.NEGATIVE_INFINITY/u);

  const page = read("src/features/monitoring/MonitoringMapPage.tsx");
  assert.match(page, /sortEventsByTimeDesc\([\s\S]{0,160}filterByCountryAndRegion/u);
});

test("TC-22: SSE chu kỳ 5 phút kích hoạt tải lại toàn bộ dữ liệu", () => {
  const page = read("src/features/monitoring/MonitoringMapPage.tsx");
  assert.match(page, /dataRefreshKey\(lastPayload\)/u);
  assert.match(page, /refreshKey === lastRefreshKey\.current/u);
  assert.match(page, /lastRefreshKey\.current = refreshKey/u);
  assert.match(page, /void load\(\)/u);
});
