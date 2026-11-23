# Testcase: Khu vực giám sát tổng hợp từ USGS & sửa lỗi bản đồ không hiển thị

## Metadata
- ID: 2026-11-23-monitoring-region-map-thien
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-23-monitoring-region-map-thien.md
- Target: apps/web/src/features/monitoring/region-catalog-view.ts, apps/web/src/components/map/tile-url.ts
- Test File: apps/web/tests/monitoring-region-map.test.ts
- Author: agent | thien
- Created: 2026-11-23
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng kiểm chứng:** hàm thuần gom sự kiện USGS thành dòng `quốc gia → khu vực` (số sự kiện & độ lớn TB thật) và hàm resolve URL tile (mặc định cùng origin `/tile`, cho phép override bằng env).
- **Ràng buộc GDMAS liên quan:**
  - [x] I1 — không đụng worker/backend; chỉ FE (T7).
  - [x] I3 — tọa độ WGS84 & timestamp UTC giữ nguyên; không đổi payload hợp đồng.
  - [x] I5 — không fallback mock; magnitude thiếu → `null`, không bịa số.
  - [x] I7 — unit test chạy offline 100%, không import leaflet, không gọi mạng.

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- **Môi trường / Mock:** mảng `MapEarthquake` thuần do test dựng (không DOM, không mạng); env object giả lập cho `resolveTileUrl`.
```json
{
  "events": [
    { "sourceEventId": "us_001", "place": "12 km NE of San Francisco, CA", "country": "USA", "region": "California", "magnitude": 5.2 },
    { "sourceEventId": "us_002", "place": "30 km E of Honshu", "country": "Japan", "region": "Honshu", "magnitude": 4.4 },
    { "sourceEventId": "us_003", "place": "near Padang", "country": null, "region": null, "magnitude": null }
  ]
}
```

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi (Assertions) | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Gom theo quốc gia & khu vực | Functional | 3 sự kiện có field BE `country`/`region` (2 cùng cặp) | 2 dòng `(USA,California)`, `(Japan,Honshu)`; dòng USA `eventCount=2`, avg `5`, max `5.2`; sort theo count giảm | `PASS` |
| `TC-02` | Fallback từ `place` khi thiếu field BE | Resilience | Sự kiện `country=null, region=null`, `place="30 km E of Honshu"` | Vẫn gom được dòng `(Japan, Honshu)` — không rớt sự kiện | `PASS` |
| `TC-03` | Magnitude thiếu → null, không bịa | Boundary | Sự kiện `magnitude=NaN` (riêng lẻ & lẫn dòng hợp lệ) | `avgMagnitude=null`, `maxMagnitude=null`; `eventCount` vẫn tăng; dòng hợp lệ giữ avg thật | `PASS` |
| `TC-04` | Sort & dedupe khi merge nguồn | Functional | `mergeRegionRows(primary, fallback)` trùng cặp, fallback có dòng khác | Cặp trùng chỉ giữ 1 dòng (ưu tiên `eventCount>0` của primary); dòng riêng của fallback vẫn có; sort theo count giảm dần | `PASS` |
| `TC-05` | Tile URL mặc định cùng origin | Functional | `resolveTileUrl({})` và env rỗng | `/tile/dark_all/{z}/{x}/{y}{r}.png` | `PASS` |
| `TC-06` | Tile URL override bằng env | Functional | `resolveTileUrl({ VITE_MAP_TILE_URL: "https://tiles.example.com/dark/{z}/{x}/{y}.png" })` | Trả đúng URL override (đã trim) | `PASS` |
| `TC-07` | `toMapEarthquake` truyền field BE | Regression | Payload có `country`/`region` | `MapEarthquake` giữ đúng 2 field | `PASS` |
| `TC-08` | Dropdown header trên pane bản đồ | UX/Regression | Đọc `globals.css` + `layout.css` | Có `--z-header:1500` / `--z-header-popover:1600`; header & dropdown dùng token mới | `PASS` |
| `TC-09` | Bộ lọc quốc gia trong trang bản đồ | Functional | Đọc `MapRegionPanel.tsx` + `MonitoringMapPage.tsx` | Có `<select id="gm-region-country">`, gọi `onCountryChange(setCountry)`, options suy từ `regionRows` | `PASS` |
| `TC-10` | Bản đồ thế giới offline | Resilience | Kiểm asset + source | `public/world-countries.geo.json` là FeatureCollection >100 features; `WorldFallbackLayer` pane `z=150`; `errorTileUrl` trong suốt; `fitWorld()` khi không focus | `PASS` |
| `TC-11` | Mặc định toàn cầu | Functional | Đọc `MonitoringMapPage.tsx` | `INITIAL_VIEW` zoom 2 (thế giới), `hasSelection` tính từ country/region, nạp `buildEarthquakeQuery(filters, null)` | `PASS` |
| `TC-12` | Fit chiều cao, không scroll page | UX | Đọc CSS + shell | `layout__content--map` `overflow:hidden`; `.gm-page`/`.gm-map` `height:100%`; không còn `72vh` | `PASS` |
| `TC-13` | Bản đồ nền sáng, popup chữ tối | UX | Đọc CSS + `SeismicMap.tsx` | Không còn `invert(1)`; nền `#f8fafc`; popup `#0f172a`/`#475569`; fallback GeoJSON tông sáng | `PASS` |
| `TC-14` | Nguồn tile không cần API key | Regression | Đọc `tile-url.ts`, `vite.config.ts`, `Dockerfile` | Default `/tile/{z}/{x}/{y}.png`, attribution OSM, proxy → `tile.openstreetmap.de`, `family:4`, không còn `cartocdn` | `PASS` |
| `TC-15` | Bản đồ nền trắng (đã thay TC-13) | UX | Đọc CSS + `SeismicMap.tsx` | Không còn `invert(1)`; nền `#f8fafc`; popup `#0f172a`/`#475569`; fallback GeoJSON tông sáng | `PASS` |
| `TC-16` | Thông báo rỗng theo ngữ cảnh | Functional | Đọc `MapEmptyOverlay.tsx` + page | Prop `hasEvents`; DB rỗng giữ câu cũ; khu vực rỗng có câu riêng; page truyền `events.length > 0` | `PASS` |
| `TC-17` | Tối ưu tốc độ tải | Performance | Đọc `SeismicMap.tsx` + page + `WorldFallbackLayer.tsx` | Fallback `enabled` mặc định false + cache promise; TileLayer `updateWhenIdle`/`updateWhenZooming=false`/`keepBuffer=2`; page không còn request `/clusters` & `/regions` riêng | `PASS` |
| `TC-18` | Lọc quốc gia xuống BE, realtime | Functional | Đọc `monitoring-view.ts` + page + curl BE | Query có `country`/`region`, `realtime` bỏ time params; `?country=Japan` trả 1.357 sự kiện (toàn bộ Japan) | `PASS` |
| `TC-19` | Danh sách kiểu USGS, không combo nội bộ | UX | Đọc `EventListPanel.tsx` + page + panel | Item có `M{mag}` – place – depth(km); page dùng `useCatalogSelection()` của header, không còn combobox quốc gia/khu vực | `PASS` |
| `TC-20` | Item 3 phần gap cố định, cao hơn | UX | Đọc component + CSS + page | `gap: var(--space-3)`; phần 1&3 `flex:0 0 auto`, phần 2 `flex:1`; có thời gian UTC, `border-left:2px`, `min-height:58px`; không còn `MapControlsPanel` trên page | `PASS` |
| `TC-21` | Ngưỡng M lấy từ BACKFILL_MIN_MAGNITUDE | Config | Đọc view/compose/page | `resolveMapMinMagnitude`, `VITE_MAP_MIN_MAGNITUDE: ${BACKFILL_MIN_MAGNITUDE}`, page dùng `MAP_MIN_MAGNITUDE` | `PASS` |
| `TC-22` | SSE chu kỳ 5 phút tải lại dữ liệu | Functional | Đọc page | `dataRefreshKey(lastPayload)`, guard `lastRefreshKey`, `void load()` | `PASS` |
| `TC-23` | Item có bộ đếm sự kiện | UX | Đọc CSS + panel | `.gm-event-panel__count` hiển thị `events.length` | `PASS` |
| `TC-24` | Sắp theo thời gian mới nhất | Functional | Test thuần + đọc source | `sortEventsByTimeDesc` đưa `new` trước `old`, timestamp hỏng cuối; query `sort_by:"event_time"`, page gọi hàm này | `PASS` |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/web && node --test tests/monitoring-region-map.test.ts
cd apps/web && pnpm test && pnpm build
```

- **Ngày chạy cuối:** 2026-11-23 (cập nhật sau Revision fix CARTO API key)
- **Kết quả quan sát thật:** `monitoring-region-map.test.ts` **8/8 PASS**; `monitoring-map-ux.test.ts` **13/13 PASS**; toàn bộ `pnpm test` **317/317 PASS** (không test nào bị xoá/skip — assertion cũ cập nhật additive); `pnpm build` **OK** (2576 modules). Asset `world-countries.geo.json`: 180 quốc gia, 173 KB. Kiểm chứng thực tế trong container `gdmas-web`: `/tile/6/32/22.png` trả **200 / ~47 KB PNG** (8/8 request), 0 lỗi proxy sau khi ép IPv4; CARTO cũ chỉ trả ~2 KB ảnh "API KEY REQUIRED".

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- `none` *(nếu phát hiện lỗi khi chạy unit test, tạo `BUG-<handle>-NNN-<slug>.md` trong `.agents/notes/bugs/` và liệt kê ID + tóm tắt tại đây).*
