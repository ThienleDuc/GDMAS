# Implementation Plan: Khu vực giám sát tổng hợp từ USGS & sửa lỗi bản đồ không hiển thị

## Metadata
- ID: 2026-11-23-monitoring-region-map-thien
- Proposal: .agents/notes/proposed/2026-11-23-monitoring-region-map-thien.md
- Approved By: thien
- Approved At: 2026-11-23
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Làm cho panel "Khu vực giám sát" hiển thị quốc gia → khu vực được tổng hợp từ sự kiện USGS (có số sự kiện & độ lớn trung bình thật), và làm cho bản đồ hiển thị được tile ở dev, preview lẫn Docker production thông qua cấu hình tile cùng origin.

---

## 2. Phạm vi
### In Scope
- `apps/web/src/lib/transforms/map-types.ts` *(bổ sung optional `country`/`region` vào `MapEarthquake`)*
- `apps/web/src/lib/transforms/map-data.ts` *(truyền `country`/`region` trong `toMapEarthquake`)*
- `apps/web/src/features/monitoring/region-catalog-view.ts` *(mới — thuần, gom & merge khu vực)*
- `apps/web/src/features/monitoring/MonitoringMapPage.tsx` *(dùng `buildMonitoringRegionRows` + `mergeRegionRows` làm nguồn chính cho panel)*
- `apps/web/src/components/map/tile-url.ts` *(mới — thuần, resolve tile URL)*
- `apps/web/src/components/map/SeismicMap.tsx` *(dùng `resolveTileUrl`)*
- `apps/web/vite.config.ts` *(dùng chung cấu hình `/tile` cho `server` và `preview`)*
- `apps/web/Dockerfile` *(nginx `location /tile/` proxy tới CARTO)*
- `apps/web/.env.example` *(biến `VITE_MAP_TILE_URL`)*
- `docs/setup.md` *(ghi chú cấu hình tile — Architecture Impact)*
- `docker-compose.yml` *(map `BACKFILL_MIN_MAGNITUDE` → `VITE_MAP_MIN_MAGNITUDE` cho web)*
- `.agents/notes/testcase/2026-11-23-monitoring-region-map-thien.md` *(đặc tả testcase sinh đồng thời)*
- `apps/web/tests/monitoring-region-map.test.ts` *(mới — test offline)*

**Bổ sung Revision 2026-11-23 (4 fix UX):**
- `apps/web/public/world-countries.geo.json` *(mới — bản đồ thế giới offline, Natural Earth public domain)*
- `apps/web/src/components/map/WorldFallbackLayer.tsx` *(mới — GeoJSON dưới tilePane)*
- `apps/web/src/styles/globals.css`, `apps/web/src/layouts/layout.css` *(token z-index header + fit chiều cao)*
- `apps/web/src/layouts/DashboardLayout.tsx` *(class `layout__content--map`)*
- `apps/web/src/components/map/MapRegionPanel.tsx`, `apps/web/src/features/monitoring/MonitoringMapPage.tsx`, `apps/web/src/features/monitoring/monitoring.css` *(select quốc gia, world view, fit height)*
- `apps/web/tests/monitoring-map-ux.test.ts` *(mới — 6 TC source-inspection)*
- `apps/web/tests/map-tile-proxy.test.ts`, `apps/web/tests/layout-styles.test.ts` *(cập nhật additive assertion)*

**Bổ sung Revision CARTO API key:** đổi nguồn tile sang OSM DE trong `tile-url.ts`, `vite.config.ts` (`https.Agent({family:4})`), `Dockerfile` (nginx `proxy_pass`), `.env.example`, `docs/setup.md`, `monitoring.css` (dark filter).

**Bổ sung các revision sau (lọc/UI/realtime/sort):**
- `apps/web/src/components/map/EventListPanel.tsx` *(mới — danh sách sự kiện kiểu USGS)*
- `apps/web/src/components/map/MapControlsPanel.tsx`, `apps/web/src/components/map/MapEmptyOverlay.tsx`, `apps/web/src/components/map/index.ts` *(bỏ filter/RSS empty state/barrel)*
- `apps/web/src/features/monitoring/monitoring-view.ts` *(country/region → query BE, realtime, resolveMapMinMagnitude, sortEventsByTimeDesc)*
- `apps/web/tests/header-map-ui.test.ts`, `apps/web/tests/monitoring-map.test.ts` *(cập nhật additive assertion)*
- `.agents/notes/proposed/2026-11-23-global-timezone-context-thien.md` *(proposal RIÊNG cho nhánh khác — nằm working tree nhưng **KHÔNG** stage/commit trong PR này)*

### Out of Scope
- `apps/api/**`, migration Alembic, `contracts/**`, `docs/api/API.md`, SSE, worker T2–T5
- Xoá/sửa `mock-region-clusters.ts`, `region-clusters.ts`, helper lọc quốc gia/khu vực cũ (I2)
- Bật lại mock/dữ liệu giả cho cụm hoặc bản đồ (I5)
- Commit/push/merge (dừng CHECKPOINT 1)

---

## 3. Các bước
### Step 1 — Artifacts
Tạo đồng thời proposal (đã có §9 Approved), `plan.md`, `status.md`, testcase; chạy `notes_index.py --check`.
### Step 2 — Nhánh
`./scripts/git-ship.sh start fix/2026-11-23-monitoring-region-map-thien` (đã rẽ từ `develop`).
### Step 3 — Khu vực từ USGS
Bổ sung field optional vào `MapEarthquake`/`toMapEarthquake`; tạo `region-catalog-view.ts` với `buildMonitoringRegionRows` + `mergeRegionRows`; cập nhật `MonitoringMapPage` truyền `regionRows` vào `MapRegionPanel`. Giữ nguyên props của panel và nguồn `/clusters` + catalog làm bổ sung.
### Step 4 — Tile bản đồ
Tạo `tile-url.ts`; đổi `SeismicMap`; gom cấu hình `/tile` dùng chung cho `server`/`preview` trong `vite.config.ts`; thêm `location /tile/` trong `Dockerfile`; cập nhật `.env.example` + `docs/setup.md`.
### Step 5 — Test offline & validation
Viết `apps/web/tests/monitoring-region-map.test.ts`; chạy `pnpm test`, `pnpm build`, `notes_index.py --check`; kiểm tra `git status --porcelain` không có xoá file ngoài ý muốn; cập nhật testcase + status → `validation`; dừng CHECKPOINT 1.

---

## 4. Thay đổi dữ liệu / API / cấu hình
- Không migration, không endpoint/schema BE mới, không đổi `contracts/`.
- Cấu hình: `VITE_MAP_TILE_URL` (mới, optional, mặc định `/tile/dark_all/{z}/{x}/{y}{r}.png`); Vite `preview.proxy["/tile"]`; nginx `location /tile/` trong `apps/web/Dockerfile`.

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] Đã tạo đặc tả testcase tại `.agents/notes/testcase/2026-11-23-monitoring-region-map-thien.md`
- [x] Đã tạo và chạy pass file test offline `apps/web/tests/monitoring-region-map.test.ts`
- [x] Backend test/lint: **N/A** (không đụng `apps/api`)
- [x] Frontend: `cd apps/web && pnpm test` (317/317 PASS) `&& pnpm build` (OK, 2576 modules); `docker compose config` OK
- [x] Notes: `python3 scripts/notes_index.py --check` → OK
- [x] Tài liệu bị ảnh hưởng (`docs/setup.md`, `apps/web/.env.example`) đã cập nhật
- [x] Kiểm chức năng: logic gom khu vực & resolve tile đã có unit test offline; kiểm tra trong trình duyệt (panel có quốc gia/khu vực + số sự kiện thật; tile nạp qua `/tile`; chọn khu vực đổi `?country=&region=`) để người dùng xác nhận tại CHECKPOINT 1.

---

## 6. Rủi ro khi làm
CARTO có thể vẫn bị chặn ở client dù đã proxy ở nginx (giảm thiểu: `VITE_MAP_TILE_URL` đổi nguồn + giữ `tileerror` warning); cấu hình nginx inline cần đúng cú pháp (giữ nguyên block cũ, thêm 1 location).

---

## 7. Rollback
Revert commit/nhánh `fix/2026-11-23-monitoring-region-map-thien`; không cần `alembic downgrade` (không có migration). Riêng tile có thể đặt lại `VITE_MAP_TILE_URL` về URL tuyệt đối CARTO nếu môi trường không proxy được `/tile`.

---

## 8. Ghi chú
Không đụng `AGENTS.md`, `contracts/`, migration cũ theo ranh giới quyền hạn. Mọi thay đổi code đều additive (I2/RULE-03).
