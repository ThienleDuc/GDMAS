# Proposal: Khu vực giám sát tổng hợp từ USGS & sửa lỗi bản đồ không hiển thị

## Metadata
- ID: 2026-11-23-monitoring-region-map-thien
- Author: agent | thien
- Created: 2026-11-23
- Type: bugfix
- Status: approved
- Priority: high
- Area: apps/web/src/features/monitoring/, apps/web/src/components/map/, apps/web/src/lib/transforms/, apps/web/vite.config.ts, apps/web/Dockerfile, apps/web/.env.example
- Architecture Impact: apps/web/Dockerfile (nginx `location /tile/` proxy tile OSM), apps/web/.env.example (`VITE_MAP_TILE_URL`, `VITE_MAP_MIN_MAGNITUDE`), docker-compose.yml (`VITE_MAP_MIN_MAGNITUDE` lấy từ `BACKFILL_MIN_MAGNITUDE`). Không đổi `contracts/`, `docs/api/API.md`, schema BE, migration.
- Related Docs:
  - docs/coding-rules.md (I1–I7, RULE-03)
  - docs/agent-workflow.md
- Related Proposals:
  - Liên quan: 2026-11-23-overview-ranking-map-ux-thien — proposal đó chỉ sửa tile proxy ở **Vite dev** (`server.proxy["/tile"]`) và dùng URL tuyệt đối CARTO khi `import.meta.env.DEV === false`; lỗi bản đồ vẫn tái diễn ở bản **production/Docker** (nginx tĩnh, không có `/tile`). Proposal này mở rộng cùng cơ chế sang production — không xoá/sửa quyết định cũ.
  - Liên quan: 2026-11-22-be-country-region-derivation-thien — BE đã suy `country`/`region` từ `place` USGS và trả field trong `/earthquakes` + 2 endpoint catalog. Proposal này **tái dùng** nguồn đó, không đụng BE.
  - Liên quan: 2026-11-22-region-clusters-no-mock-thien — panel khu vực hiện lấy từ `/clusters` (DBSCAN). Giữ adapter cũ làm nguồn bổ sung (I2), không xoá.
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Trang `/monitoring` (T7) có panel "Khu vực giám sát" và bản đồ Leaflet CARTO Dark. Từ 2026-11-22, Backend đã tách `place` của USGS thành `country`/`region` và trả trong payload `/earthquakes` cùng `/earthquakes/countries`, `/earthquakes/regions`.

### Vấn đề
Người dùng (`thien`) báo 2026-11-23, khi checkout nhánh mới từ `develop`:
1. "hiển thị khu vực giám sát theo khu vực của quốc gia được tổng hợp dựa trên api của usgs" — panel "Khu vực giám sát" hiện lấy danh sách chính từ `GET /api/v1/clusters`; số cụm DBSCAN đang bằng 0 nên panel rỗng (chỉ hiện "Không có cụm phù hợp"), dù dữ liệu sự kiện USGS đã có `country`/`region`.
2. "Lỗi: không hiển thị được bản đồ" — bản đồ trắng sau khi build/triển khai.

### Ảnh hưởng
- Panel rỗng → người dùng không thấy khu vực giám sát dù có hàng chục quốc gia trong DB (đã backfill `all_month`).
- Bản đồ là hạng mục trình diễn trực tiếp (Kịch bản Demo §4); mất tile = mất khả năng giám sát trực quan.

---

## 2. Hiện trạng
- `MonitoringMapPage.tsx`: `fetchRegionClusters()` đọc `/clusters` → `buildRegionClusterRows()`; `getRegionCatalog(country)` chỉ đưa vào `extraRegions` (phần còn lại sau khi trừ cluster). Vì `/clusters` trả rỗng, `visibleClusters = []`; panel phụ thuộc vào `catalogRegions` (danh sách **phẳng tên khu vực, không gắn quốc gia**, không có số sự kiện) → không đúng yêu cầu "theo khu vực của quốc gia ... được tổng hợp".
- `SeismicMap.tsx`: `TILE_URL = import.meta.env.DEV ? "/tile/dark_all/... " : "https://{s}.basemaps.cartocdn.com/dark_all/..."`.
- `vite.config.ts`: chỉ có `server.proxy["/tile"]` → CARTO (dev). `vite preview` và ảnh Docker (`nginx:alpine`, cấu hình inline chỉ `try_files`) **không có** `/tile`.
- `apps/web/.env.example`: chưa có biến cấu hình tile.
- `pnpm build` hiện tại **sạch** (2574 modules, OK) → lỗi không phải do TypeScript/build.

**Kết luận nguyên nhân (đã kiểm chứng bằng code):** lỗi bản đồ là tile CARTO bị chặn ở client ở bản production (URL tuyệt đối), trong khi fix trước chỉ áp dụng cho Vite dev. Panel rỗng do nguồn `/clusters` = 0.

---

## 3. Mục tiêu
- **Mục tiêu:**
  1. Panel "Khu vực giám sát" liệt kê **quốc gia → khu vực** được **tổng hợp từ dữ liệu sự kiện USGS** (do BE suy `country`/`region`): mỗi dòng có tên khu vực, tên quốc gia (khi đang xem tất cả), **số sự kiện thật** và **độ lớn trung bình thật**; magnitude thiếu → `null` (không bịa số, I5).
  2. Chọn một dòng → cập nhật lựa chọn `?country=&region=` dùng chung với header/Danh mục (giữ hành vi hiện tại).
  3. Bản đồ hiển thị được ở cả dev, preview và Docker production: tile dùng **cùng origin `/tile`** có cấu hình tập trung (biến `VITE_MAP_TILE_URL`), có nginx proxy tương ứng; giữ cảnh báo `tileerror` và marker vẫn vẽ tại tọa độ WGS84 khi tile lỗi.
- **Không nằm trong mục tiêu (Out of Scope):**
  - Không đụng `apps/api/**`, migration, `contracts/`, `docs/api/API.md`, SSE, worker T2–T5.
  - Không tự seed cụm DBSCAN / không bật lại mock (I5).
  - Không xoá `mock-region-clusters.ts`, `region-clusters.ts`, helper lọc quốc gia/khu vực cũ (I2).
  - Không commit/push/merge ở proposal này (dừng CHECKPOINT 1).

---

## 4. Giải pháp đề xuất
Tuân **RULE-03 / I2** (chỉ thêm field optional, module thuần và cấu hình mới; giữ nguyên chữ ký/props cũ), **I3** (UTC `Z`, WGS84 không đổi), **I5** (không mock, Dark Mode), **I7** (test offline).

### 4.1. Tổng hợp khu vực từ USGS (FE thuần)
1. `map-types.ts` + `map-data.ts`: bổ sung `country?`/`region?` vào `MapEarthquake` và truyền qua từ `EarthquakeItem` (additive, I2).
2. Tệp mới `apps/web/src/features/monitoring/region-catalog-view.ts` (thuần, không React/leaflet/network):
   - `buildMonitoringRegionRows(items)` — gom `MapEarthquake[]` theo cặp `(country, region)`, ưu tiên field BE, fallback `countryFromPlace`/`regionFromPlace` từ `place`; đếm sự kiện, tính `avgMagnitude`/`maxMagnitude`; magnitude không hợp lệ → `null`; sort theo `eventCount` rồi tên; trả `RegionClusterRow[]`.
   - `mergeRegionRows(primary, fallback)` — dedupe theo `country\0region`, ưu tiên dòng có `eventCount > 0` từ dữ liệu sự kiện; giữ dòng cũ khi chưa có sự kiện (I2 — không mất nguồn `/clusters`).
3. `MonitoringMapPage.tsx`: `regionRows = mergeRegionRows(buildMonitoringRegionRows(events), regionClusters)`; truyền `clusters={regionRows}` cho `MapRegionPanel`. `events` là dữ liệu đã tải từ `getEarthquakes` (nguồn USGS qua BE), **lấy trước khi lọc theo country/region** để người dùng vẫn thấy các khu vực có thể chọn. Giữ `getRegionCatalog` làm nguồn bổ sung như hiện tại.

### 4.2. Sửa lỗi bản đồ không hiển thị
4. Tệp mới `apps/web/src/components/map/tile-url.ts` (thuần): `resolveTileUrl(env)` trả `VITE_MAP_TILE_URL` khi đặt, mặc định `/tile/dark_all/{z}/{x}/{y}{r}.png` (cùng origin); `TILE_ATTRIBUTION` giữ nguyên.
5. `SeismicMap.tsx`: dùng `resolveTileUrl(import.meta.env)` thay cho logic `DEV ? ... : ...`. Giữ `attribution`, `tileerror`, `preferCanvas`.
6. `vite.config.ts`: thêm `preview.proxy["/tile"]` trùng `server.proxy["/tile"]` (tránh lặp config — dùng một hàm `tileProxy` dùng chung).
7. `apps/web/Dockerfile`: thêm `location /tile/ { proxy_pass https://a.basemaps.cartocdn.com/; proxy_set_header Host a.basemaps.cartocdn.com; }` vào cấu hình nginx inline (cùng origin).
8. `apps/web/.env.example` + `docs/setup.md` (mục cấu hình FE): ghi chú `VITE_MAP_TILE_URL` (mặc định `/tile/...`; có thể để URL tuyệt đối nếu không proxy). **Không** commit file `.env` thật (I6).

### 4.3. Kiểm chứng thiết kế
- Logic gom nhóm nằm ở module thuần → test `node --test` offline 100%, không import leaflet, không gọi mạng (I7).
- Tile là tài nguyên mạng ngoài duy nhất; khi lỗi vẫn có `tileerror` warning + marker tại tọa độ WGS84 (I3/I5).
- Mọi thay đổi đều additive: props cũ của `MapRegionPanel`, chữ ký `toMapEarthquake`, `fetchRegionClusters` giữ nguyên (I2).

---

## 5. Phương án đã cân nhắc
### Phương án A: Thêm endpoint BE `/earthquakes/monitoring-regions`
Ưu: một request, nhóm sẵn theo `(country, region)`. Nhược: đụng `apps/api/`, `contracts/`, `docs/api/API.md` + test BE; vượt phạm vi sửa lỗi FE đang gặp. **Không chọn** (có thể tách proposal BE riêng nếu cần toàn cục thay vì cửa sổ đang tải).

### Phương án B: Gọi `/regions?country=` cho từng country từ `/countries`
Ưu: dùng endpoint có sẵn. Nhược: ~100 request khi đã backfill `all_month`; chậm và spam API. **Không chọn**.

### Phương án C (chọn): Gom từ sự kiện đã tải trên bản đồ + giữ catalog làm bổ sung
Ưu: đúng nghĩa "tổng hợp từ USGS", không request mới, số liệu thật theo đúng cửa sổ thời gian/magnitude đang xem, tận dụng field `country`/`region` có sẵn, test thuần dễ. Nhược: danh sách khu vực giới hạn trong số sự kiện đã tải (`limit ≤ 100`) — đây là hành vi nhất quán với dữ liệu đang hiển thị trên bản đồ. **Chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Trung bình | 2 module thuần + 1 sửa page + 1 cấu hình tile |
| Hiệu năng | Tốt | Không thêm request; gom trên mảng đã có (O(n)) |
| Open-Closed | Tốt | Chỉ thêm field optional/module/hàm; không xoá file cũ |
| Độ tin cậy | Trung bình | Tile phụ thuộc mạng; đã có fallback cảnh báo + marker |
| Phạm vi | Hẹp | Không đụng BE/contracts/migration |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Nguồn tile thay đổi/bị chặn | Trung bình | Trung bình | `VITE_MAP_TILE_URL` cho phép đổi nguồn; GeoJSON local + marker vẫn hiển thị |
| Nginx inline trong Dockerfile sai cú pháp | Thấp | Cao | Giữ nguyên cấu hình cũ, chỉ thêm 1 location; kiểm tra bằng build image nếu có Docker |
| Sự kiện đã tải không đủ phủ mọi khu vực | Trung bình | Thấp | Giữ `catalogRegions` + `/clusters` làm nguồn bổ sung; ghi rõ trong UI là theo dữ liệu đang tải |
| Test hiện tại soi cứng `TILE_URL` tuyệt đối | Thấp | Thấp | Chạy toàn bộ `pnpm test`; cập nhật test additive, không xoá case cũ |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời:** `.agents/notes/testcase/2026-11-23-monitoring-region-map-thien.md` *(copy `_TEMPLATE.md`, `Mode: proposal-paired`)*
- **Code test tự động (offline):**
  - `apps/web/tests/monitoring-region-map.test.ts` *(mới — gom nhóm country/region, fallback `place`, dedupe, sort, magnitude null; `resolveTileUrl` mặc định cùng origin và override env)*
- **Cách kiểm chứng:** `cd apps/web && pnpm test && pnpm build`; `python3 scripts/notes_index.py --check`; mở `/monitoring` trên dev (`pnpm dev`) và bản Docker (`/tile` qua nginx) thấy tile Dark + panel có quốc gia/khu vực kèm số sự kiện; chọn dòng khu vực → URL `?country=&region=` đổi và marker lọc đúng; thử đổi `VITE_MAP_TILE_URL` → tile đổi nguồn.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-23
Comments: Người dùng (`thien`) chỉ thị trực tiếp trong chat 2026-11-23: "checkout sang nhánh mới từ develop để giải quyết vấn đề page monitoring: 1. hiển thị khu vực giám sát theo khu vực của quốc gia được tổng hợp dựa trên api của usgs 2. Lỗi: không hiển thị được bản đồ". Chỉ thị rõ ràng, đúng phạm vi FE + cấu hình tile; ghi nhận §9 Approved theo quy chế thả lỏng (không cần chờ ThienleDuc). Nhánh `fix/2026-11-23-monitoring-region-map-thien` đã rẽ từ develop. Không đụng BE/contracts/migration.
Scope of Rejection: -

---

## 10. Next Action
§9 Approved → `build-implementation`: tạo đồng thời `implemented/<id>/{plan.md,status.md}` + testcase, code theo RULE-03 & I1–I7, validation (`pnpm test`, `pnpm build`, `notes_index --check`), đặt `Status: validation` rồi **dừng CHECKPOINT 1** (cụm khởi động: `tiếp tục workflow`).

### Revision 2026-11-23 (bổ sung 4 fix UX — người dùng chọn "sửa thêm" tại CHECKPOINT 1)
 Người dùng (`thien`) bổ sung trực tiếp trong chat cùng ngày, giữ nguyên §9 Approved:
 1. **Dropdown quốc gia trên header bị bản đồ che:** thêm token `--z-header: 1500` / `--z-header-popover: 1600`; `.layout__header` và `.layout__country-dropdown` dùng token mới (pane Leaflet chỉ tới ~1200).
 2. **Lọc khu vực theo quốc gia ngay trong trang Bản đồ:** tái dùng 2 prop optional vốn đã có của `MapRegionPanel` (`countries`, `onCountryChange`) — thêm `<select id="gm-region-country">`; `MonitoringMapPage` truyền danh sách quốc gia suy từ chính sự kiện USGS đã tải và gọi `setCountry` (đồng bộ `?country=` với header/Danh mục). Không thêm request.
 3. **Bản đồ vẫn trắng — hiển thị bằng mọi cách, mặc định bản đồ thế giới:** đóng gói GeoJSON Natural Earth (public domain) tại `apps/web/public/world-countries.geo.json` (173 KB); component mới `WorldFallbackLayer.tsx` vẽ lục địa trong custom pane `z-index 150` (dưới `tilePane` 200) — tile có thì phủ lên, tile lỗi thì nền thế giới vẫn hiện; `TileLayer.errorTileUrl` là ảnh trong suốt (không có icon gãy). Mặc định `INITIAL_VIEW` = thế giới, `FocusSync` gọi `fitWorld()` khi chưa chọn quốc gia/khu vực; nạp dữ liệu toàn cục (`bbox = null`).
 4. **Panel + bản đồ fit chiều cao còn lại, không scroll page:** `DashboardLayout` thêm class `layout__content--map` trên `/monitoring`; CSS đặt `display:flex; overflow:hidden`, `.gm-page`/`.gm-workspace`/`.gm-map` dùng `height:100%; min-height:0` (bỏ `72vh`/`520px` cố định).
 - Artifacts/test bổ sung: `apps/web/tests/monitoring-map-ux.test.ts` (5 TC source-inspection), cập nhật additive 2 assertion cũ trong `map-tile-proxy.test.ts` và `layout-styles.test.ts`. Không xoá/skip test nào.

### Revision 2026-11-23 (fix nguyên nhân thật: CARTO yêu cầu API key)
- Người dùng báo từ Docker compose: bản đồ **chỉ có chấm màu**, nền hiện chữ **"API KEY REQUIRED — carto.com/basemaps/apikey"**. Kiểm chứng: CARTO trả HTTP 200 nhưng là ảnh placeholder ~2 KB → `tileerror` **không** bắn nên fallback GeoJSON không kích hoạt.
- Quyết định: bỏ hoàn toàn CARTO basemap; dùng **OSM DE** (`https://tile.openstreetmap.de/{z}/{x}/{y}.png`) qua cùng proxy `/tile` (Vite dev/preview + nginx production) — tile thật ~47 KB, **không cần API key**. Cập nhật `DEFAULT_TILE_URL`, attribution OSM, `vite.config.ts`, `Dockerfile`, `.env.example`, `docs/setup.md`.
- Giữ Dark Mode bằng CSS `filter: invert(1) hue-rotate(180deg) ...` **chỉ trên `.leaflet-tile-pane`** (không đảo marker/popup) — I5.
- Docker gặp `ETIMEDOUT` chập chờn do DNS trả IPv6 trước mà container không ra IPv6 → dùng `https.Agent({ family: 4, keepAlive: true })` cho proxy. Kiểm chứng trong container `gdmas-web`: 8/8 request `/tile/...` trả 200, 0 lỗi proxy.
- Test: cập nhật `map-tile-proxy.test.ts` (TC-04/05: OSM, không CARTO, `family:4`, nginx), thêm TC-13 trong `monitoring-map-ux.test.ts` (dark filter). Toàn bộ **310/310 PASS**, `pnpm build` OK.
- §9 vẫn Approved; không đụng BE/contracts/migration. Người dùng chỉ cần **refresh trình duyệt** (Vite trong container đã tự restart khi `vite.config.ts` thay đổi qua bind mount).

### Revision 2026-11-23 (bản đồ nền trắng + thông báo rỗng theo ngữ cảnh)
- Người dùng báo bản đồ đảo màu đen khó đọc → yêu cầu **nền trắng**. Bỏ CSS `filter: invert(1) ...` trên `.leaflet-tile-pane`; nền `.gm-map`/`.gm-map__canvas` và `MapContainer` đổi sang `#f8fafc`; tile OSM giữ màu gốc. Fallback GeoJSON đổi sang tông sáng (`#e2e8f0`/`#94a3b8`).
- Popup Leaflet vốn có nền trắng → đổi chữ từ `#e2e8f0` sang `#0f172a`, nhãn `#475569`, link `#0e7490` để đọc được. **Đây là ngoại lệ có chủ đích với I5 (Dark Mode)** theo chỉ thị trực tiếp của người dùng; phần còn lại của UI giữ nguyên Dark Mode.
- Thông báo rỗng: `MapEmptyOverlay` nhận prop optional `hasEvents` (I2) — DB rỗng giữ nguyên câu "Cơ sở dữ liệu đang rỗng — bản đồ vẫn sẵn sàng nhận dữ liệu mới."; khi đã có sự kiện nhưng khu vực đang chọn rỗng → "Không có sự kiện trong khu vực đang chọn — bản đồ vẫn sẵn sàng nhận dữ liệu mới.". Overlay vẫn `pointer-events:none`, bản đồ tiếp tục nhận SSE/dữ liệu mới.
- Test: cập nhật TC-13, thêm TC-14 trong `monitoring-map-ux.test.ts`; `pnpm test` **311/311 PASS**, `pnpm build` OK.

### Revision 2026-11-23 (tối ưu tốc độ tải bản đồ)
- Người dùng hỏi có thể load nhanh hơn không. Các điểm nghẽn: (a) `WorldFallbackLayer` tải **173 KB GeoJSON ngay khi vào trang** dù tile OSM chạy tốt; (b) Leaflet tải lại tile liên tục khi pan/zoom; (c) `GET /clusters` chạy song song ngay lúc đầu dù thường rỗng.
- Xử lý:
  1. `WorldFallbackLayer` nhận prop `enabled` (mặc định `false`) — chỉ tải khi `tileerror`; promise GeoJSON được **cache ở module scope** (`cachedWorld`) → vào lại trang không tải lại. Tiết kiệm 173 KB + chi phí vẽ 180 feature ở lần load thường.
  2. `TileLayer`: `updateWhenIdle`, `updateWhenZooming={false}`, `keepBuffer={2}`, `minZoom=2`, `maxZoom=18` — giảm request chồng chéo khi pan/zoom. Đã kiểm chứng trong `leaflet-src.js`: `onAdd()` vẫn gọi `_resetView()` → tile nền vẫn tải ngay lúc mount (không gây trắng).
  3. `fetchRegionClusters` trì hoãn đến sau khi sự kiện đầu tiên nạp xong (`if (loading) return` + dependency `[loading]`) → ưu tiên marker/tile trước.
- Test: cập nhật TC-10, thêm TC-15 (`monitoring-map-ux.test.ts`). `pnpm test` **312/312 PASS**, `pnpm build` OK. Không đổi API/contracts.

### Revision 2026-11-23 (lọc ở header + danh sách kiểu USGS + bỏ thời gian)
- Người dùng báo bộ lọc hiện tại **không hoạt động** và yêu cầu: (1) chỉ lọc quốc gia bằng combobox trên header, **bỏ combobox trong panel "Khu vực giám sát"**; (2) panel đổi thành danh sách sự kiện theo cách USGS map — mỗi dòng **độ lớn – địa điểm – độ sâu**; (3) bản đồ realtime nên **bỏ bộ lọc thời gian**.
- **Nguyên nhân lọc hỏng:** trước đây `MonitoringMapPage` chỉ lọc FE trên 100 sự kiện đầu trang (`limit≤100`, sort theo magnitude) — chọn quốc gia ít sự kiện thường ra rỗng. BE đã hỗ trợ `?country=&region=` từ proposal 2026-11-22 nhưng FE không truyền.
- Xử lý:
  1. `buildEarthquakeQuery(filters, bbox, { country, region, realtime })` — đẩy `country`/`region` xuống query BE; khi `realtime: true` **không gửi** `start_time`/`end_time`. Giữ hành vi cũ khi không truyền option (I2).
  2. `MonitoringMapPage`: lấy `country`/`region` từ `useCatalogSelection()` (header/URL); **không còn** `MapRegionPanel`, `getRegionCatalog`, `fetchRegionClusters` → giảm 2 request. Thay bằng `EventListPanel` mới (`M5.2` – `place` – `10.5 km`, click focus sự kiện, CSS riêng, scroll nội bộ). FE vẫn lọc lại như lớp an toàn.
  3. `MapControlsPanel`: bỏ preset 24h/7d/30d và prop `onTimeRangeChange` (giữ optional để caller cũ không vỡ — I2). CSS preset cũ được giữ (I2) nhưng không còn component render.
- Kiểm chứng BE: `GET /earthquakes?limit=3` → total 37.408; `?country=Japan&limit=3` → total 1.357, mọi `country=Japan` → lọc server-side đúng.
- Test: cập nhật `header-map-ui.test.ts`, `map-tile-proxy.test.ts`, `monitoring-map-ux.test.ts`; `pnpm test` **312/312 PASS**, `pnpm build` OK. Không đụng contracts/BE/migration.

### Revision 2026-11-23 (tinh chỉnh item danh sách & nút Lọc)
- `EventListPanel`: mỗi dòng chia 3 phần tỷ lệ **2-8-2** — (2) độ lớn `M5.2`, (8) địa điểm + thời gian UTC xếp 2 dòng (`formatEventTime(..., "UTC")`), (2) độ sâu `km` căn phải.
- Viền trái item giảm từ `4px` → **`2px`**.
- `MapControlsPanel`: bỏ nút "Làm mới", thay bằng nút **"Lọc"**; slider chỉ cập nhật bản nháp, bấm "Lọc" mới gọi `onApply(draftMagnitude)` → page `setFilters` → refetch. Giữ `onMagnitudeChange`/`onRefresh` optional để caller cũ không vỡ (I2).
- Test: thêm TC-20 trong `monitoring-map-ux.test.ts`; `pnpm test` **313/313 PASS**, `pnpm build` OK.

### Revision 2026-11-23 (điều chỉnh lại bố cục item)
- Bỏ tỷ lệ 2-8-2 theo yêu cầu người dùng. Thay bằng: `.gm-event-item` có `gap: var(--space-3)` cố định giữa 3 phần; phần 1 (độ lớn) và phần 3 (độ sâu) `flex: 0 0 auto` (co theo nội dung); phần 2 (địa điểm + thời gian, 2 dòng) `flex: 1; min-width: 0` (lấy phần còn lại, cắt "..." khi dài). Viền trái vẫn `2px`, nút "Lọc" giữ nguyên.
- Cập nhật TC-20; `pnpm test` **313/313 PASS**, `pnpm build` OK.

### Revision 2026-11-23 (thanh độ lớn tối đa — lọc theo range)
- `MapFilters` bổ sung `maxMagnitude?: number` (mặc định `10` trong `DEFAULT_MAP_FILTERS`); `shouldShowMarker`/`filterEarthquakes` loại bỏ sự kiện `magnitude > maxMagnitude` (lớp FE an toàn); `buildEarthquakeQuery` thêm `max_magnitude` vào query BE.
- `MapControlsPanel`: thêm slider **"Độ lớn tối đa"** (`id="gm-max-magnitude"`, 0–10, step 0.1) cạnh slider tối thiểu; tự clamp để `min ≤ max` (kéo bên này vượt bên kia thì bên kia đẩy theo); bấm "Lọc" gọi `onApply(min, max)`.
- Kiểm chứng BE: `min_magnitude=4&max_magnitude=5` → 14.715 sự kiện (so với 16.218 khi chỉ min=4) — range có tác dụng.
- Test: thêm TC-21; `pnpm test` **314/314 PASS**, `pnpm build` OK. Không đụng contracts/BE/migration.

### Revision 2026-11-23 (bỏ bộ lọc, lấy ngưỡng từ BACKFILL_MIN_MAGNITUDE, SSE 5 phút)
- Người dùng: "Bản đồ realtime mà lọc thì thấy không lắm, dựa vào BACKFILL_MIN_MAGNITUDE trong .env để lọc, bỏ bộ lọc" + "thêm tí chiều cho items" + "luôn cập nhật mới khi SSE 5 phút".
- `docker-compose.yml` web service bổ sung `VITE_MAP_MIN_MAGNITUDE: ${BACKFILL_MIN_MAGNITUDE:-2.5}` (cùng nguồn `.env` với worker); `.env.example` ghi chú tương ứng. FE có hàm thuần `resolveMapMinMagnitude(env)` (default 2.5, clamp [0,10]) → `MonitoringMapPage` dùng cho `filters.minMagnitude`.
- **Bỏ hoàn toàn** `MapControlsPanel` khỏi trang (giữ file/type theo I2): không slider min/max, không nút "Lọc"; số sự kiện chuyển vào tiêu đề `EventListPanel`.
- Item danh sách cao hơn: `min-height: 58px`, padding `var(--space-3) var(--space-2)`; có thêm span đếm sự kiện.
- SSE: `dataRefreshKey(lastPayload)` (SSE `ingestion_cycle_completed`, chu kỳ 5 phút của T2) → `load()` lại toàn bộ dữ liệu, guard bằng `lastRefreshKey` ref để tránh lặp; `applySseEvent` vẫn cập nhật marker tức thì.
- **Lưu ý vận hành:** container đang chạy chưa có biến mới → cần `docker compose up -d --force-recreate web` để `VITE_MAP_MIN_MAGNITUDE` có hiệu lực.
- Test: cập nhật TC-20/TC-21, thêm TC-22; `pnpm test` **315/315 PASS**, `pnpm build` OK, `docker compose config` OK.
- Ý 4 (UTC toàn cục) **tách proposal riêng** `2026-11-23-global-timezone-context-thien` — không gộp vào nhánh này.

### Revision 2026-11-23 (sắp theo thời gian mới nhất)
- Người dùng yêu cầu danh sách "Sự kiện động đất" xếp theo thời gian mới nhất thay vì độ lớn.
- `buildEarthquakeQuery`: `sort_by: "event_time"`, `order: "desc"` (BE hỗ trợ `event_time|magnitude|depth_km` — `earthquakes.py:81`).
- Hàm thuần mới `sortEventsByTimeDesc(events)` trong `monitoring-view.ts`: sort theo `Date.parse(eventTime)` giảm dần, timestamp hỏng → `Number.NEGATIVE_INFINITY` (cuối danh sách), stable sort cho các mốc bằng nhau; page áp dụng sau khi lọc country/region để cả sự kiện SSE mới cũng đúng thứ tự.
- Test: cập nhật `monitoring-map.test.ts` TC-01, thêm TC-08 runtime + TC-25 source-inspection; `pnpm test` **317/317 PASS**, `pnpm build` OK.
