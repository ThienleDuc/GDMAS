# Implementation Plan: Bản đồ GIS Leaflet với marker động đất — trang `/monitoring` (T7.04)

## Metadata
- ID: 2026-11-21-monitoring-leaflet-map-markers-thien
- Proposal: .agents/notes/proposed/2026-11-21-monitoring-leaflet-map-markers-thien.md
- Approved By: thien
- Approved At: 2026-11-21
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Thay `PlaceholderPage` trên route `/monitoring` bằng bản đồ Leaflet Dark Mode thật: marker WGS84 từ `EarthquakeItem[]`, popup 6 trường, điều khiển nổi (magnitude debounce + thời gian UTC), HUD tọa độ tâm lấy từ viewport, overlay "Không có sự kiện" khi DB rỗng, cập nhật marker từ SSE của shell. Logic thuần tách riêng để test offline 100%.

---

## 2. Phạm vi
### In Scope
- `apps/web/src/features/monitoring/monitoring-view.ts` — module logic thuần (query builder, view state, SSE reducer, popup fields), không DOM/leaflet.
- `apps/web/src/features/monitoring/sse-context.ts` — context chia sẻ kết quả `useSSE` của shell (không tạo `EventSource` mới).
- `apps/web/src/features/monitoring/MonitoringMapPage.tsx` — page điều phối Loading/Error/Empty/Ready.
- `apps/web/src/features/monitoring/monitoring.css` — CSS riêng của page (token `globals.css`).
- `apps/web/src/components/map/SeismicMap.tsx` — `MapContainer` + tile Dark + `moveend`/`zoomend` + `tileerror`.
- `apps/web/src/components/map/EarthquakeMarkerLayer.tsx` — `CircleMarker` theo `markerStyleFor`, popup.
- `apps/web/src/components/map/MapPopupCard.tsx` — 6 trường popup (UTC + UTC+7).
- `apps/web/src/components/map/MapControlsPanel.tsx` — slider magnitude debounce + preset thời gian + làm mới.
- `apps/web/src/components/map/MapViewportHud.tsx` — HUD tọa độ tâm/zoom thực.
- `apps/web/src/components/map/MapEmptyOverlay.tsx` — overlay DB rỗng.
- `apps/web/src/components/map/index.ts` — barrel export.
- `apps/web/src/app/App.tsx` — thay 1 dòng placeholder bằng `MonitoringMapPage`.
- `apps/web/src/layouts/DashboardLayout.tsx` — bổ sung provider quanh `<Outlet />` (additive).
- `apps/web/tests/monitoring-map.test.ts` — unit test offline mới.
- `apps/web/tests/geo-format.test.ts`, `apps/web/tests/map-data.test.ts` — bổ sung case additive (không xóa/sửa case cũ).
- `.agents/notes/testcase/2026-11-21-monitoring-leaflet-map-markers-thien.md` — đặc tả testcase sinh đồng thời.

**Bổ sung Revision 2026-11-21:**
- `apps/web/src/features/earthquakes/region-filter.ts` (mới), `apps/web/src/features/earthquakes/country-clusters.ts` (additive pattern mã tiểu bang Mỹ), `apps/web/src/features/earthquakes/catalog-selection.ts` (mới) — suy quốc gia/khu vực từ `place`, parse/serialize URL.
- `apps/web/src/features/earthquakes/useCatalogSelection.ts` (mới) — hook đọc/ghi `?country=&region=` (chỉ dùng ở trang bản đồ; `EarthquakesPage.tsx` đã hoàn nguyên, nằm ở Out of Scope).
- `apps/web/src/components/map/MapLegend.tsx` (mới), `apps/web/src/features/monitoring/monitoring-view.ts` (`magnitudeLevelLabel`, `MAP_PAGE_SIZE = 100`) — chấm màu/nhãn Độ lớn.
- `apps/web/src/lib/api-client.ts`, `apps/web/src/contracts/common.ts`, `apps/web/src/contracts/earthquake.ts`, `apps/web/src/services/earthquake-api.ts`, `apps/web/src/hooks/useEarthquakeInsights.ts`, `apps/web/dev-mock.ts` — sửa FE theo audit B1/O2/C1/C2/C4/C5 (§4.9 proposal).
- `apps/web/tests/region-filter.test.ts`, `apps/web/tests/catalog-selection.test.ts`, `apps/web/tests/region-clusters.test.ts` (mới) + bổ sung `apps/web/tests/monitoring-map.test.ts`, `apps/web/tests/geo-format.test.ts`, `apps/web/tests/map-data.test.ts`.
- Vòng 3–6: `apps/web/src/components/map/MapRegionPanel.tsx` (mới), `apps/web/src/features/monitoring/region-clusters.ts` (mới), `apps/web/src/features/monitoring/mock-region-clusters.ts` (mới), `apps/web/src/styles/index.css` (import CSS tập trung), `apps/web/src/features/monitoring/MonitoringMapPage.tsx` (layout sidebar trái), `apps/web/src/features/monitoring/monitoring.css` (legend góc trái-dưới, responsive, ellipsis), `apps/web/src/components/map/MapControlsPanel.tsx` (bỏ select, gộp vào sidebar).

### Out of Scope
- `apps/web/src/lib/transforms/map-data.ts`, `map-types.ts`, `lib/formatters.ts`, `lib/sse.ts`, `hooks/useSSE.ts`, `services/**`, `contracts/**` (đã chuẩn ở T7.01/T7.02).
- `apps/api/**`, `contracts/` (schema/example), migration Alembic, `docs/api/API.md`, `AGENTS.md`, `package.json` (không thêm dependency).
- T7.05 (`ClusterLayer`), T7.10 UI shell khác, mock runtime, commit/push/merge.
- `apps/web/src/features/earthquakes/EarthquakesPage.tsx` — người dùng yêu cầu hoàn nguyên về trạng thái checkout; không thuộc scope.
- `apps/api/**` (đặc biệt B2: BE `/clusters` thiếu `dominant_place` — cần proposal riêng, chủ vùng `van`), repository-level `contracts/`, migration Alembic, `docs/api/API.md` (vùng khóa — drift docs-only đã ghi nhận ở §4.9).

---

## 3. Các bước
### Step 1 — Logic thuần & testcase
Viết `monitoring-view.ts`: `buildEarthquakeQuery(filters, bbox)` → `QueryEarthquakeParams` (`start_time`/`end_time` UTC `Z`, bbox WGS84, `sort_by=magnitude`, `order=desc`); `deriveMapState(loading, error, events)`; `applySseEvent(events, payload)` (dedupe `earthquake_detected`, xóa khi `database_cleared`); `popupFields(item)` (6 trường, thiếu → `"—"`). Dùng lại `timeRangeBounds`, `viewportToBbox`, `filterEarthquakes`, `formatCoordinate`, `formatEventTime`. Sinh đồng thời testcase `<id>.md`.

### Step 2 — Component bản đồ
`components/map/*`: `SeismicMap` (CARTO Dark, attribution, `preferCanvas`, `moveend`/`zoomend` → callback, `tileerror` overlay), `EarthquakeMarkerLayer` (`CircleMarker` + popup), `MapPopupCard`, `MapControlsPanel` (debounce 400 ms), `MapViewportHud`, `MapEmptyOverlay`, barrel `index.ts`.

### Step 3 — Page + wire
`MonitoringMapPage.tsx`: fetch `getEarthquakes(params, signal)` với `AbortController`, quản lý filters mặc định `DEFAULT_MAP_FILTERS`, subscribe `useSseMarkers()`, 3 trạng thái + overlay rỗng. `App.tsx`: thay placeholder của `APP_ROUTES.MONITORING`. `DashboardLayout.tsx`: bổ sung provider giữ nguyên `useSSE` hiện có.

### Step 4 — Test & validation
`apps/web/tests/monitoring-map.test.ts` (thuần, mock), bổ sung additive 2 test cũ. Chạy `pnpm build && pnpm test`, `notes_index.py --check`, kiểm tra không có file bị xóa (`git status --porcelain`). Đặt `Status: validation`, dừng CHECKPOINT 1.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có. Không đổi endpoint/schema/env/dependency; chỉ tiêu thụ `GET /api/v1/earthquakes` và SSE `/api/v1/stream/earthquakes` đã có.

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] Đã tạo đặc tả testcase `.agents/notes/testcase/2026-11-21-monitoring-leaflet-map-markers-thien.md`
- [x] Đã tạo và chạy pass test offline `apps/web/tests/monitoring-map.test.ts`
- [x] `cd apps/web && pnpm build`
- [x] `cd apps/web && pnpm test` (không giảm số test hiện có)
- [x] `python3 scripts/notes_index.py --check`
- [x] Kiểm tra OCP: `git status --porcelain` không có `D`, không đụng tệp lõi
- [x] Kiểm chức năng: marker khớp sample `37.7749° N, 122.4194° W`; popup đủ 6 trường; DB rỗng → overlay; HUD đổi theo viewport; `map-data.ts` không import leaflet

---

## 6. Rủi ro khi làm
- StrictMode double-init Leaflet → chỉ render `MapContainer` trong component, key ổn định, test qua logic thuần.
- Tile mạng ngoài → `tileerror` cảnh báo, marker vẫn vẽ.
- SSE payload dị biệt → guard trong `applySseEvent`, bỏ event không hợp lệ.
- Debounce/stale response → `AbortController` + hủy request khi đổi filter.

---

## 7. Rollback
Revert commit/PR trên nhánh `feat/...`; page quay lại `PlaceholderPage`; không có thay đổi DB/schema/API nên không cần downgrade.

---

## 8. Ghi chú
Repo FE dùng `node --test` (không có DOM lib) nên mọi logic cần test được tách thuần; component chỉ render + gọi helper. Nhánh đã được rẽ trước khi sửa code theo Phần A `review-pr`.
