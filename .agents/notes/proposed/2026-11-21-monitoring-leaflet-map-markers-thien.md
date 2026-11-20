# Proposal: Bản đồ GIS Leaflet với marker động đất — trang `/monitoring` (Task T7.04)

## Metadata
- ID: 2026-11-21-monitoring-leaflet-map-markers-thien
- Author: agent | thien
- Created: 2026-11-21
- Type: feature
- Status: approved   <!-- proposed | changes_requested | approved | rejected (khớp với Decision ở §9) -->
- Priority: high
- Area: `apps/web/src/features/monitoring/`, `apps/web/src/components/map/`, `apps/web/src/app/App.tsx`, `apps/web/src/layouts/DashboardLayout.tsx` (bổ sung), `apps/web/src/features/earthquakes/` (chỉ helper/filter — **KHÔNG đổi `EarthquakesPage.tsx`**), `apps/web/tests/`
- Architecture Impact: none
  <!-- Chỉ dựng UI FE + hiệu chỉnh type FE nội bộ (apps/web/src/contracts/, api-client.ts) theo payload BE thật; KHÔNG đổi endpoint, schema repo-level contracts/, payload BE, docs/api/API.md. Audit phát hiện BE /clusters thiếu dominant_place (B2) — ghi nhận đề xuất, KHÔNG tự sửa apps/api/** (chủ vùng van). Khối GIS/Leaflet đã được docs/architecture.md §7.7 mô tả; proposal này dựng lại trên nền lib/transforms/ đã chuẩn hóa ở PR #26. -->
- Related Docs:
  - docs/task/thien.md — T7.04 (dòng 122–141: "Cần xây lại"), §0.4 quy ước I1–I7
  - docs/api/API.md §3.2 (`GET /api/v1/earthquakes`: envelope, params UTC `Z`, bbox WGS84) và §3.5 (SSE)
  - docs/architecture.md §7.7 (GIS/Leaflet), §12 (cấu trúc FE)
  - docs/coding-rules.md, docs/quyuocchung.md (I1–I7, RULE-03)
  - contracts/README.md §3.1, §3.8 (không fallback mock khi DB rỗng / endpoint 404)
  - contracts/schemas/clusters.json, contracts/examples/earthquake_sample.json
- Related Proposals:
  - .agents/notes/proposed/2026-11-16-fe-contract-gis-reports-thien.md — Approved nhưng phần GIS Map (khung SVG giả, `components/map/`) đã bị gỡ trong PR #26; proposal này **dựng lại** trên nền mới, không khôi phục mã cũ.
  - .agents/notes/proposed/2026-11-20-fe-restructure-globals-css-thien.md — nền FE mới: 1 layout, `globals.css`, `lib/transforms/map-data.ts`, `services/earthquake-api.ts`.
  - .agents/notes/proposed/2026-11-20-fe-t6-contract-services-audit-thien.md — T7.02 đã chuẩn hóa `getEarthquakes`/guard UTC–WGS84.
  - .agents/notes/proposed/2026-11-20-earthquakes-catalog-filter-thien.md — T7.03; làm mẫu cho cách tách logic thuần + test `node --test` offline.
  - Overrides: 2026-11-16-fe-contract-gis-reports-thien — **chỉ riêng phần Task 2 (GIS Map)**, vì mã đó đã bị xóa trong PR #26; không thay đổi các quyết định còn lại (contracts, services, SSE) của proposal đó. Scope of Rejection của proposal cũ là `-`, không cấm dựng lại bản đồ.
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Sau PR #26 (T7.01) và T7.02/T7.03, nền Frontend đã sạch: một `DashboardLayout` duy nhất, `contracts/` tách theo schema, `lib/transforms/map-data.ts` chứa **toàn bộ hàm thuần** bản đồ (`magnitudeToRadius`, `magnitudeToColor`, `depthToOpacity`, `markerStyleFor`, `haversineKm`, `viewportToBbox`, `filterEarthquakes`, `formatCoordinate`, `timeRangeBounds`, …), không import `leaflet`. Dependency `leaflet@^1.9.4` + `react-leaflet@^5.0.0` và `import "leaflet/dist/leaflet.css"` trong `main.tsx` đã có sẵn, chạy offline được.

Tuy nhiên route `APP_ROUTES.MONITORING` (`/monitoring`) ở `App.tsx:23` vẫn trỏ tới `PlaceholderPage title="Bản đồ Giám sát"`. `apps/web/src/components/map/` hiện **rỗng** (đã gỡ trong PR #26). Các hàm transform đúng chuẩn WGS84/UTC kia chưa có giao diện nào tiêu thụ.

### Vấn đề
Chưa có bản đồ GIS thật: chưa vẽ marker từ `EarthquakeItem[]` theo `latitude`/`longitude`, chưa có popup 6 trường, chưa có điều khiển nổi (magnitude/time range) và HUD đang không hiển thị tọa độ tâm bản đồ thực (bản cũ hardcode `16.0544° N | 108.2022° E`). Kết nối SSE đã có ở shell nhưng chưa có cơ chế để trang bản đồ nhận sự kiện `earthquake_detected` / `database_cleared` mà **không tạo thêm `EventSource`**.

### Ảnh hưởng
Bản đồ là hạng mục trình diễn trực tiếp trong Kịch bản Demo 6 bước (`docs/yeucaubatbuoc.md` §4). Nếu quay lại hardcode tọa độ hoặc dùng marker/số liệu giả khi DB rỗng sẽ vi phạm I3 (UTC/WGS84) và I5; nếu import `leaflet` vào file thuần sẽ phá I7 (test offline).

---

## 2. Hiện trạng
| Thành phần | Hiện trạng |
|---|---|
| `apps/web/src/app/App.tsx:23` | `APP_ROUTES.MONITORING` → `<PlaceholderPage title="Bản đồ Giám sát" />` |
| `apps/web/src/components/map/` | Thư mục rỗng (mã cũ bị gỡ trong PR #26) |
| `apps/web/src/lib/transforms/map-data.ts` (303 dòng) | Đầy đủ hàm thuần; **giữ nguyên, không sửa**; import type từ `services/earthquake-api` + `./map-types`, không import leaflet |
| `apps/web/src/lib/formatters.ts` / `utils/timezone.ts` | `formatEventTime(mode)`, `formatWgs84Point`, `toUtcIso`, `isWgs84` — dùng cho popup UTC + giờ địa phương |
| `apps/web/src/services/earthquake-api.ts` | `getEarthquakes(params, signal)` validate UTC `Z` + bbox WGS84; `getOptionalApi`, `getClusters*` đã có |
| `apps/web/src/hooks/useSSE.ts` + `DashboardLayout.tsx:38` | **Một** kết nối SSE duy nhất được giữ tại shell; `useSSE(endpoint?)` trả `{data,status,isConnected,lastEventTime,reconnectAttempt}` |
| `apps/web/main.tsx` | Đã `import "leaflet/dist/leaflet.css"` (không còn `<link>` unpkg như bản cũ) |
| `apps/web/package.json` | Đã có `leaflet`, `react-leaflet`, `@types/leaflet`; test = `node --test tests/*.test.ts` (không có DOM lib) |
| `apps/web/tests/geo-format.test.ts`, `apps/web/tests/map-data.test.ts` | Đã tồn tại và pass; **không xóa/không đổi runner**, chỉ bổ sung case mới |
| `contracts/examples/earthquake_sample.json` | Mẫu chuẩn: `latitude: 37.7749`, `longitude: -122.4194`, `magnitude: 4.2`, `depth_km: 10.5`, `place`, `source_event_id`, `event_time` (UTC `Z`), `source_url` |

---

## 3. Mục tiêu
- **Mục tiêu:**
  1. Trang `/monitoring` hiển thị bản đồ Leaflet Dark Mode trên `DashboardLayout` duy nhất, thay `PlaceholderPage`.
  2. Marker `CircleMarker` vẽ đúng WGS84 từ `EarthquakeItem[]`; bán kính/màu/độ mờ lấy từ `magnitudeToRadius` / `magnitudeToColor` / `depthToOpacity` (không tự tính lại).
  3. Popup đủ **6 trường**: `place`, `source_event_id`, `event_time` (UTC **và** giờ địa phương), `depth_km`, `magnitude`, `source_url` (link mở nếu có, thiếu → `"—"`).
  4. Điều khiển nổi: thanh trượt magnitude có **debounce 400 ms** + `AbortController`, chọn khoảng thời gian (24h/7d/30d/all → `start_time`/`end_time` UTC `Z`), HUD hiển thị **tọa độ tâm/zoom thực** lấy từ sự kiện `moveend`/`zoomend` của Leaflet.
  5. DB rỗng → `MapContainer` vẫn nạp (tile + điều khiển), overlay báo "Không có sự kiện"; không fallback mock (I5).
  6. Nhận SSE từ kết nối duy nhất của shell (qua context bổ sung): `earthquake_detected` → cập nhật marker, `database_cleared` → xóa marker + hiện overlay rỗng. Không tạo `EventSource` mới.
  7. Tách logic thuần (`monitoring-view.ts`) để test **offline 100%** bằng `node --test`; `map-data.ts` giữ nguyên.
  8. **Đổi mọi nhãn "Magnitude" sang "Độ lớn"** trên giao diện bản đồ (và rà soát các nhãn hiển thị liên quan); tên biến/hàm/code vẫn giữ tiếng Anh theo quy ước.
  9. **Bản đồ realtime theo quốc gia → khu vực:** lấy danh sách quốc gia từ dữ liệu thật qua helper có sẵn `countriesFromItems`/`countryFromPlace`; bổ sung helper thuần xác định **khu vực trong quốc gia đang chọn** từ trường `place` (không có field BE riêng). Chọn quốc gia → chọn khu vực → marker lọc theo cả hai, vẫn cập nhật theo SSE.
  10. **Đồng bộ với trang Danh mục (`/earthquakes`):** lựa chọn `country`/`region` được chia sẻ qua URL query params, đổi ở trang nào thì trang kia áp dụng; giữ hành vi cũ của Danh mục khi không có param.
  11. **Chấm màu theo mức độ:** marker dùng thang màu `magnitudeToColor` (đỏ/cam/vàng/cyan) kèm **chú giải MapLegend** với nhãn mức độ tiếng Việt (Yếu / Trung bình / Mạnh / Rất mạnh) — không dùng màu tùy tiện.
  12. **Tự thu aside** khi vào `/monitoring` để mở rộng không gian bản đồ; người dùng vẫn có nút mở lại thanh điều hướng.
- **Không nằm trong mục tiêu (Out of Scope):**
  - Không đổi `contracts/`, `docs/api/API.md`, `apps/api/**`, migration Alembic, `AGENTS.md`.
  - Không sửa/chuyển chỗ `lib/transforms/map-data.ts` và `map-types.ts`; không thêm dependency (leaflet/react-leaflet có sẵn; không đưa Vitest/RTL vào).
  - Không dựng **lớp cụm DBSCAN** (`ClusterLayer`) — thuộc T7.05; `normalizeClusters` được giữ nguyên để task sau dùng.
  - Không sửa hành vi `useSSE(endpoint?)`, không thêm SSE endpoint; chỉ bổ sung 1 context chia sẻ kết quả đã có của shell.
  - Không commit/push/merge ở proposal này (dừng CHECKPOINT 1 sau khi triển khai).

---

## 4. Giải pháp đề xuất
Tuân thủ **RULE-03 / I2** (chỉ thêm file mới, thay 1 dòng placeholder, bổ sung provider), **I3** (UTC `Z`, WGS84), **I5** (Dark Mode, không mock), **I7** (test thuần offline).

### 4.1. Tệp mới
| Tệp | Vai trò |
|---|---|
| `apps/web/src/features/monitoring/MonitoringMapPage.tsx` | Page điều phối: gọi `getEarthquakes(params, signal)`, quản lý 3 trạng thái, clamp viewport, subscribe SSE context, render lớp bản đồ + điều khiển + overlay |
| `apps/web/src/features/monitoring/monitoring-view.ts` | **Logic thuần, không DOM/leaflet**: `buildEarthquakeQuery(filters, bbox)`, `deriveMapState(loading, error, events)`, `applySseEvent(events, payload)`, `popupFields(item)` (map 6 trường, thiếu → `"—"`), `centerLabel(viewport)`. Dùng `timeRangeBounds`, `viewportToBbox`, `filterEarthquakes`, `formatCoordinate`, `formatEventTime` có sẵn |
| `apps/web/src/features/monitoring/monitoring.css` | CSS riêng của page (theo convention `EarthquakesPage.css`), dùng token `globals.css`, Dark Mode |
| `apps/web/src/features/monitoring/sse-context.ts` | `createContext` + hook `useSseMarkers()` — **chỉ chia sẻ** kết quả `useSSE` của shell, không tạo `EventSource` |
| `apps/web/src/components/map/SeismicMap.tsx` | `MapContainer` + `TileLayer` CARTO Dark (`{s}.basemaps.cartocdn.com/dark_all/...`, kèm attribution) + `ZoomControl`; `preferCanvas`; bắt `moveend`/`zoomend` → `onViewportChange`; bắt `tileerror` → overlay "Không tải được tile", marker vẫn vẽ |
| `apps/web/src/components/map/EarthquakeMarkerLayer.tsx` | `CircleMarker` tại `[latitude, longitude]` với `markerStyleFor(event)`; `Popup` nội dung từ `MapPopupCard` |
| `apps/web/src/components/map/MapPopupCard.tsx` | Hiển thị đúng 6 trường theo `popupFields()`; `event_time` UTC + local qua `formatEventTime(..., "UTC"|"UTC+7")`; `source_url` thành link nếu hợp lệ |
| `apps/web/src/components/map/MapControlsPanel.tsx` | Panel nổi: slider magnitude 0–9 (debounce 400 ms), preset thời gian (`timeRangeLabel`), nút làm mới |
| `apps/web/src/components/map/MapViewportHud.tsx` | HUD tọa độ tâm + zoom **thực** từ `onViewportChange`, format bằng `formatCoordinate` (không số tĩnh) |
| `apps/web/src/components/map/MapEmptyOverlay.tsx` | Overlay "Không có sự kiện" khi `data.length === 0` (DB rỗng / sau `database_cleared`) |
| `apps/web/src/components/map/index.ts` | Barrel export cho các component bản đồ |
| `apps/web/tests/monitoring-map.test.ts` | Test thuần `node:test` cho `monitoring-view.ts` (mới) |

### 4.2. Tệp hiện có bị đụng (tối thiểu)
- `apps/web/src/app/App.tsx`: thay 1 dòng `PlaceholderPage` của `APP_ROUTES.MONITORING` bằng `<MonitoringMapPage />` (thêm 1 import). Giữ nguyên 5 route khác.
- `apps/web/src/layouts/DashboardLayout.tsx`: **bổ sung** `SseProvider` bọc quanh `<Outlet />` với giá trị `useSSE("/api/v1/stream/earthquakes")` đã có sẵn — không đổi chữ ký, không thêm kết nối, không đổi UI/aside.
- `apps/web/tests/geo-format.test.ts`, `apps/web/tests/map-data.test.ts`: **thêm case mới (additive)** cho sample `earthquake_sample.json` (37.7749° N, 122.4194° W), popup 6 trường, Haversine và filter theo magnitude/time; không xóa/sửa case đang pass.

### 4.3. Luồng dữ liệu
1. `MonitoringMapPage` đọc filters mặc định `DEFAULT_MAP_FILTERS` (`minMagnitude: 2.5`, `timeRange: "7d"`) → `timeRangeBounds` + `viewportToBbox` → `buildEarthquakeQuery` → `getEarthquakes(params, signal)`.
2. Debounce 400 ms trên slider; mỗi lần đổi filter/bbox → hủy request cũ bằng `AbortController`, reset về trang đầu, refetch.
3. `deriveMapState` → Loading (skeleton giữ bản đồ nền) / Error (`ApiError` + nút Thử lại) / Empty (overlay) / Ready (marker).
4. `applySseEvent`: `earthquake_detected` thêm/cập nhật marker theo `source_event_id` (dedupe), `database_cleared` trả mảng rỗng → overlay; mọi logic nằm ở module thuần để test offline.
5. HUD lấy center từ `map.getCenter()`/`getZoom()` qua callback, không đọc biến tĩnh.

### 4.4. Kiểm chứng thiết kế
- Không import `leaflet` trong `monitoring-view.ts`, `map-data.ts`, `map-types.ts`, `services/` hay file test → `node --test` chạy không cần DOM/mạng.
- Tile CARTO là tài nguyên mạng ngoài duy nhất; `tileerror` chỉ hiện cảnh báo, không làm rỗng marker.
- Marker sample đối chiếu trực tiếp `contracts/examples/earthquake_sample.json` → `37.7749° N, 122.4194° W`.

### 4.5. Lọc realtime theo quốc gia → khu vực (bổ sung)
- **Tái dùng** helper thuần đã có của Danh mục: `countryFromPlace` / `countriesFromItems` / `filterItemsByCountry` (`apps/web/src/features/earthquakes/{country-clusters,country-filter}.ts`). BE **không có** field `country`/`region` riêng — mọi phân loại đều suy từ `place`, tuyệt đối không thêm field giả vào payload.
- **Phát hiện cần xử lý:** với mẫu `"12 km NE of San Francisco, CA"` hiện `countryFromPlace` trả `"CA"` (đoạn cuối sau dấu phẩy) thay vì `"USA"` — bổ sung **additive** pattern nhận diện mã tiểu bang Mỹ (`CA`, `AK`, `HI`, …) vào `COUNTRY_PATTERNS`, không xóa pattern cũ.
- **Thêm mới (additive)** `apps/web/src/features/earthquakes/region-filter.ts` — module thuần, không React/DOM/network:
  - `regionFromPlace(place, country)`: bỏ phần khoảng cách/hướng (`"12 km NE of "`), bỏ tên quốc gia nếu có, trả nhãn khu vực (`"San Francisco, CA"`, `"Honshu"`, `"Northern Sumatra"`…); thiếu → `"Khác"`.
  - `regionsFromItems(items, country)`: danh sách khu vực duy nhất, đã sort, của quốc gia đang chọn.
  - `filterItemsByRegion(items, country, region)` với sentinel `ALL_REGIONS = "all"`.
- **Hành vi fetch:** khi `country = all` và `region = all` → giữ bbox theo viewport như §4.3; khi đã chọn quốc gia/khu vực → **bỏ bbox**, nạp toàn bộ cửa sổ thời gian (giới hạn `MAP_PAGE_SIZE`) rồi lọc FE — bảo đảm sự kiện của quốc gia được chọn không bị loại vì đang nhìn khu vực khác. SSE vẫn áp dụng `applySseEvent` trước khi lọc.
- **UI:** `MapControlsPanel` thêm 2 `<select>` (Quốc gia / Khu vực). Khu vực chỉ bật sau khi đã chọn quốc gia; đổi quốc gia → reset khu vực về `all`.

### 4.6. Đồng bộ lựa chọn với trang Danh mục qua URL
- Thêm hook thuần-phần `apps/web/src/features/earthquakes/useCatalogSelection.ts` dùng `useSearchParams` (react-router-dom v7 đã có): nguồn sự thật là `?country=<...>&region=<...>`, mặc định `all`.
- `EarthquakesPage.tsx`: **KHÔNG thuộc phạm vi** — đã hoàn nguyên về trạng thái lúc checkout theo chỉ thị người dùng (2026-11-21). Hook `useCatalogSelection` vẫn được dùng ở bản đồ; khi nào được phép sửa Danh mục thì chỉ cần dùng chung hook này để đồng bộ 2 chiều.
- `MonitoringMapPage.tsx`: đọc/ghi `?country=&region=` qua hook; dùng `setSearchParams(..., { replace: true })` để không spam lịch sử. Danh mục hiện **không** đọc param này (đã hoàn nguyên theo yêu cầu) — đồng bộ 2 chiều chỉ khi được phép sửa `EarthquakesPage.tsx`.
- Không thêm dependency, không đổi `APP_ROUTES`, không phá chữ ký service/contract (I2).

### 4.7. Tiếng Việt & chú giải màu mức độ
- Đổi nhãn điều khiển `"Magnitude tối thiểu"` → **"Độ lớn tối thiểu"**; rà soát mọi chuỗi hiển thị "Magnitude" trong `components/map/` và page. Tên code (`magnitude`, `minMagnitude`, `magnitudeToColor`) giữ nguyên tiếng Anh.
- Thêm `magnitudeLevelLabel(magnitude)` (thuần, trong `monitoring-view.ts`) ánh xạ đúng ngưỡng của `magnitudeToColor`: `< 4 → "Yếu"`, `4–<5 → "Trung bình"`, `5–<6 → "Mạnh"`, `≥ 6 → "Rất mạnh"`; giá trị không hợp lệ → `"Không rõ"`.
- Thêm `apps/web/src/components/map/MapLegend.tsx`: 4 ô màu lấy trực tiếp từ `magnitudeToColor` + nhãn từ hàm trên, đặt góc bản đồ; popup giữ 6 trường với nhãn "Độ lớn".

### 4.8. Tự thu aside khi mở Bản đồ giám sát
- Trong `DashboardLayout.tsx`, thêm `useEffect` theo `location.pathname`: khi bằng `APP_ROUTES.MONITORING` → `setSidebarOpen(false)`; rời trang không tự mở lại (người dùng bấm nút để mở). Giữ nguyên một kết nối SSE và mọi route khác.

### 4.9. Đối chiếu hợp đồng FE ↔ BE — kết quả & xử lý (bổ sung theo yêu cầu)
Audit read-only giữa `apps/web/src/contracts/*.ts` + `services/earthquake-api.ts` với `apps/api/src/gdmas/api/routes/*.py`, `schemas/`, `contracts/schemas/*.json`, `docs/api/API.md`. Kết luận: **phần lớn khớp** (envelope `/earthquakes`, metadata, 15 query params, bbox 4 param, wire SSE, 6 mã lỗi, base `/api/v1`). Các điểm cần xử lý:

| Mức | Phát hiện (bằng chứng) | Xử lý trong revision này |
|---|---|---|
| **B1 blocking** | BE trả rỗng bằng HTTP **200 + `{success:false, data:null, message}`** (`predictions.py:18-20,40-41,83-84`; `clusters.py:45-46`; `analysis.py:86-89`; `patterns.py:39-45`), nhưng `fetchApi` (`api-client.ts:90-99`) + `isApiEnvelope` (`common.ts:79-88`) ném `ApiError("Envelope phản hồi API không hợp lệ.", 200)` → trang hiển thị Error thay vì Empty. **Ảnh hưởng trực tiếp DoD DB rỗng.** | **Sửa FE** (không sửa BE): thêm `isApiEmptyEnvelope()` trong `common.ts`; `fetchApi` trả envelope `success:false` thay vì throw; `getEarthquakes` chuẩn hoá `data: null → []` + metadata mặc định. Giữ nguyên `isApiErrorEnvelope` cho lỗi thật. |
| **B2 blocking (T7.05)** | `/clusters` (`clusters.py:19-29,48-57`) **không emit `dominant_place`/`radius_km`**, trong khi `groupClustersByCountry` (`country-clusters.ts:47-50`) đọc `dominant_place \|\| name` → mọi cụm thật rơi vào `"Khác"` (fixture có field nên che lỗi). | **Cần BE bổ sung** (chủ vùng `van` / T4) — **không tự sửa `apps/api/**`**. FE thêm fallback phòng thủ + ghi chú; đưa vào câu hỏi cuối phiên để xác nhận có tạo proposal BE riêng không. Không chặn T7.04 (lọc quốc gia dùng `place` của sự kiện, không dùng cụm). |
| **O2 → blocking cho code hiện tại** | BE `limit: Query(20, ge=1, le=100)` (`earthquakes.py:58`); `MAP_PAGE_SIZE = 500` trong `monitoring-view.ts` sẽ bị BE trả **400 VALIDATION_ERROR**. | Đổi `MAP_PAGE_SIZE = 100` và clamp ở `buildEarthquakeQuery`; bổ sung test biên. |
| C1 | `EarthquakeItem` thiếu `raw_data` có thật ở BE (`schemas/earthquake.py:23`). | Thêm `raw_data?: Record<string, unknown> \| null` (additive). |
| C2 | `ApiErrorBody.details?: Record<string, unknown>` nhưng BE truyền **chuỗi** (`errors.py:12`, `earthquakes.py:36`,…). | Nới type thành `string \| Record<string, unknown> \| null`. |
| C4 | `dev-mock.ts:30-37` ghi `data: JSON.stringify(event.data)` (inner data), lệch wire BE `sse.py:59-62` & parser `lib/sse.ts:85-104`. | Bọc đúng `{event,data,timestamp}` (dev-only). |
| C5 | FE gửi `start_time/end_time` tới `/analysis/trend|seasonality|correlation` nhưng BE bỏ qua (`analysis.py:142-146,195-196,228-229`). | Bỏ param ở 3 hàm (optional, không ảnh hưởng T7.04). |
| Docs-only | `docs/api/API.md` lỗi thời ở statistics/system-status/SSE (`summary_24h`, `data_ingestion`, `data` phẳng) — FE & BE **đã đồng nhất**. | **Ghi nhận, không sửa** (`docs/api/API.md` là vùng khóa). |

- Xác nhận cho yêu cầu bản đồ: **không có** field `country`/`region`/`admin1` ở cả BE lẫn FE; BE `place` là `str | None`. Vì vậy lọc quốc gia/khu vực phải suy từ `place` như §4.5 — đây là lựa chọn đúng, không phải thiếu sót hợp đồng. `place` null → `"Khác"` (không bịa số).

---

## 5. Phương án đã cân nhắc
### Phương án A: Viết logic trong component, `import leaflet` ngay trong `map-data.ts`
Ưu: ít file. Nhược: phá I7 (test offline không chạy được), sửa file thuần đã ổn định, vi phạm yêu cầu "map-data.ts giữ nguyên". **Không chọn.**

### Phương án B: Tạo `useSSE()` riêng trong `MonitoringMapPage`
Ưu: tự quản lý event. Nhược: sinh `EventSource` thứ 2 trùng với shell (`DashboardLayout.tsx:38`), vi phạm T7.10 "giữ một kết nối tại shell" và lãng phí kết nối. **Không chọn.**

### Phương án C (chọn): Dùng hàm thuần có sẵn + component mỏng + context chia sẻ SSE của shell
Ưu: test offline 100%, không đổi dependency, không đổi API/contract, tôn trọng một kết nối SSE, dễ nối T7.05 sau này. Nhược: số file tăng (~11 file mới) và cần sửa 1 dòng `App.tsx` + bổ sung provider trong layout. **Chọn** — tính kiểm chứng và Open-Closed quan trọng hơn số file.

### Phương án D: Tự vẽ SVG/Canvas thay Leaflet
Ưu: không cần tile mạng. Nhược: trái chỉ thị "dùng leaflet/react-leaflet có sẵn", mất zoom/pan. **Không chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Tăng ~11 tệp mới (9 UI + view + test) | Tách logic thuần để test offline; component chỉ render |
| Hiệu năng | `preferCanvas`, giới hạn `limit`/bbox theo viewport, debounce 400 ms + hủy request | Tránh tải quá nhiều marker và spam API khi kéo slider |
| Bảo trì / Open-Closed | Tốt: giữ nguyên `map-data.ts`, `useSSE`, services; chỉ thêm file + 1 dòng route + provider bổ sung | RULE-03 / I2 — không phá module khác |
| Độ tin cậy | 3 trạng thái rõ ràng, DB rỗng vẫn hiện bản đồ + overlay, tile lỗi không xóa marker | I5 + Demo §4 |
| Dependency | Không đổi `package.json` | leaflet/react-leaflet đã có; tránh rủi ro cài thêm thư viện |
| Đồng bộ 2 trang | Dùng URL query params làm nguồn sự thật thay vì store nội bộ | Chỉ thêm 1 hook + 1 select, không dependency, chia sẻ được link |
| Lọc quốc gia/khu vực | FE suy từ `place`; khi chọn cụ thể bỏ bbox để nạp đủ dữ liệu | BE không có field riêng; tradeoff: tải nhiều bản ghi hơn nhưng không thiếu marker |
| Thu aside tự động | Chỉ thu khi vào `/monitoring`, có nút mở lại | Mở rộng không gian bản đồ mà không khóa điều hướng |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Leaflet double-init / lỗi khi mount trong StrictMode | Trung bình | Trung bình | Chỉ tạo `MapContainer` trong component, key ổn định, test qua logic thuần thay vì render DOM |
| Tile CARTO cần mạng (offline) | Cao | Thấp | Bắt `tileerror` → overlay cảnh báo; marker vẫn vẽ trên nền tối |
| SSE payload dị biệt làm crash marker | Thấp | Trung bình | `applySseEvent` kiểu guard, bỏ payload không hợp lệ (đã có `isKnownSseEvent` ở lib/sse) |
| Context SSE mới gây render lại cả layout | Thấp | Thấp | Provider bọc `Outlet`, giá trị là object ổn định từ `useSSE`; không đổi aside/topbar |
| Filter debounce gây request chồng chéo | Trung bình | Thấp | `AbortController` + `signal` của `getEarthquakes`, reset khi đổi filter |
| `notes_index.py --check` lệch do thêm note | Thấp | Thấp | Chạy check trước khi commit; không sửa tay README index |
| Suy quốc gia/khu vực từ `place` sai với địa danh mới | Trung bình | Trung bình | Fallback `"Khác"`/đoạn cuối, bổ sung pattern additive, test fixture thật |
| URL param `country`/`region` lạ | Thấp | Thấp | Hook chuẩn hoá về `all`, effect reset như Danh mục; không crash |
| Thu aside làm người dùng bối rối | Thấp | Thấp | Chỉ áp dụng trên `/monitoring`, giữ nút mở lại, không tự mở ở trang khác |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-21-monitoring-leaflet-map-markers-thien.md` *(copy từ `.agents/notes/testcase/_TEMPLATE.md`, `Mode: proposal-paired`)*
- **Code test tự động (offline):**
  - `apps/web/tests/monitoring-map.test.ts` *(mới — `node:test`, mock thuần: buildEarthquakeQuery UTC/WGS84, deriveMapState 3 trạng thái, applySseEvent thêm/dedupe/xóa, popupFields đủ 6 trường với sample)*
  - `apps/web/tests/geo-format.test.ts` *(bổ sung additive — khớp sample `37.7749° N, 122.4194° W`, UTC `Z` + UTC+7 cho popup)*
  - `apps/web/tests/map-data.test.ts` *(bổ sung additive — Haversine/preset/filter theo sample; giữ nguyên các TC-08…TC-13 hiện có)*
  - `apps/web/tests/region-filter.test.ts` *(mới — `countryFromPlace` nhận mã tiểu bang Mỹ, `regionFromPlace`/`regionsFromItems`/`filterItemsByRegion` với sample và CA→USA)*
  - `apps/web/tests/catalog-selection.test.ts` *(mới — parse/serialize `?country=&region=`, giá trị lạ → `all`)*
  - `apps/web/tests/country-clusters.test.ts`, `apps/web/tests/mock-earthquakes.test.ts` *(bổ sung additive — giữ case cũ, thêm case mã tiểu bang)*
  - `apps/web/tests/monitoring-map.test.ts` *(bổ sung — lọc quốc gia/khu vực, bỏ bbox khi chọn cụ thể, `magnitudeLevelLabel`, kiểm `MapLegend` dùng `magnitudeToColor`)*
- **Cách kiểm chứng:**
  - `cd apps/web && pnpm build` (`tsc -b && vite build`) sạch lỗi
  - `cd apps/web && pnpm test` (toàn bộ test `node --test tests/*.test.ts` pass, không giảm số test)
  - `python3 scripts/notes_index.py --check`
  - Kiểm chức năng: mở `/monitoring` thấy tile Dark + marker đúng tọa độ sample; popup đủ 6 trường với nhãn "Độ lớn"; kéo slider/time range → refetch đúng query; HUD đổi theo `moveend`; xóa rỗng DB hoặc nhận `database_cleared` → bản đồ vẫn nạp + overlay "Không có sự kiện".
  - Kiểm chức năng bổ sung: chọn quốc gia → hanya marker của quốc gia đó (kể cả sự kiện SSE mới); chọn tiếp khu vực → thu hẹp hơn nữa; chuyển sang `/earthquakes` giữ nguyên lựa chọn qua URL và ngược lại; vào `/monitoring` thì aside tự thu, vẫn bấm mở lại được; chú giải 4 màu/kèm nhãn mức độ tiếng Việt hiển thị trên bản đồ.
  - **Không** chạy `uv run pytest`/`ruff` (không đụng `apps/api`).

---

## 9. Human Review
Decision: Approved   <!-- Pending | Changes Requested | Approved | Rejected — bất kỳ thành viên nào trong .agents/team.md (kể cả tác giả) đều duyệt được; không cần ThienleDuc -->
Reviewer: thien
Review Date: 2026-11-21
Comments: (1) 2026-11-21 — người dùng (`thien`) xác nhận: "Approved - tiếp tục workflow"; duyệt §4 vòng 1 (bản đồ, marker/popup 6 trường, SSE shell, test offline). Nhánh `feat/2026-11-21-monitoring-leaflet-map-markers-thien` đã rẽ từ develop theo yêu cầu. (2) 2026-11-21 — cùng người duyệt ra chỉ thị bổ sung trực tiếp: "cập nhật proposal hiện tại, Magnitude dịch sang tiếng việt. đối chiếu contracts hiện tại so với Be cần sửa gì không, nếu có thì sửa lại để fe đồng bộ. bản đồ giám sát phải realtime theo danh mục quốc gia, theo từng khu vực của quốc gia được chọn. đồng bộ với bên danh mục, có các chấm màu sắc tùy thuộc với mức độ. khi chọn Bản đồ giám sát thì tự động thu aside để mở rộng không gian." → chấp nhận Revision 2026-11-21 (§3/§4/§6/§7/§8); giữ §9 Approved theo xác nhận rõ của người đang thao tác. Không tự ý đụng `apps/api/**`, `contracts/` repo-level hay `docs/api/API.md`; riêng B2 cần chủ vùng `van` quyết định.
Scope of Rejection: -   <!-- bắt buộc khi Rejected: "Rejected for: <use-case cụ thể>, not a ban on <công nghệ/pattern> in general." -->

---

## 10. Next Action
§9 đã `Approved` (Comments ghi rõ chỉ thị bổ sung + `### Revision 2026-11-21`). Nhánh `feat/2026-11-21-monitoring-leaflet-map-markers-thien` đã rẽ sẵn; code vòng 1 đang ở working tree (101/101 test pass, build sạch, chưa commit/push). Tiếp theo: cập nhật `status.md` sang `in_progress`, bổ sung testcase theo ma trận mở rộng (TC-13…TC-18), triển khai §4.5–4.9, chạy `pnpm build` + `pnpm test`, đặt lại `Status: validation` rồi **dừng CHECKPOINT 1** (cụm khởi động: `tiếp tục workflow`).

### Revision 2026-11-21
- Đổi nhãn UI "Magnitude" → "Độ lớn" (giữ tên code tiếng Anh).
- Audit hợp đồng FE↔BE: sửa FE theo B1 (empty state 200/`success:false`), O2 (`limit ≤ 100` — đang là 500 gây 400), C1 (`raw_data`), C2 (`details`), C4 (mock SSE), C5 (param analysis); ghi nhận B2 cần BE emit `dominant_place` (không tự sửa BE); docs-only drift ghi nhận không sửa. Chi tiết §4.9.
- Bản đồ lọc realtime theo quốc gia → khu vực: tái dùng `countryFromPlace`/`countriesFromItems`, thêm `region-filter.ts` thuần, bổ sung pattern mã tiểu bang Mỹ, bỏ bbox khi đã chọn cụ thể.
- Đồng bộ lựa chọn `?country=&region=` giữa `/monitoring` và `/earthquakes` qua hook `useCatalogSelection`.
- Chấm màu theo mức độ + `MapLegend` nhãn tiếng Việt (Yếu/Trung bình/Mạnh/Rất mạnh) dùng `magnitudeToColor`.
- Tự thu aside khi vào `/monitoring`; người dùng vẫn bấm mở lại được.
- Trạng thái artifacts: `Status: approved`, §9 `Approved` (Comments ghi chỉ thị bổ sung); `plan.md` cập nhật In Scope; `status.md` → `in_progress`; `testcase/<id>.md` bổ sung TC-13…TC-18 (chưa chạy); chưa commit/push.
