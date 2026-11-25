# Testcase: Bản đồ GIS Leaflet với marker động đất — `/monitoring` (T7.04)

## Metadata
- ID: 2026-11-21-monitoring-leaflet-map-markers-thien
- Mode: single-file-test   <!-- proposal-paired | single-file-test -->
- Proposal: none
- Target: `apps/web/src/features/monitoring/monitoring-view.ts`, `apps/web/src/features/earthquakes/region-filter.ts`, `apps/web/src/features/earthquakes/useCatalogSelection.ts`, `apps/web/src/lib/api-client.ts` (+ `apps/web/src/lib/transforms/map-data.ts` giữ nguyên)
- Test File: `apps/web/tests/monitoring-map.test.ts` + `apps/web/tests/region-filter.test.ts` + `apps/web/tests/catalog-selection.test.ts` + `apps/web/tests/region-clusters.test.ts` (mới) + bổ sung `apps/web/tests/{geo-format,map-data,country-clusters,mock-earthquakes}.test.ts`
- Author: agent | thien
- Created: 2026-11-21
- Status: passed   <!-- draft | ready | passed | failed_with_bugs -->
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng kiểm chứng:** logic thuần `monitoring-view.ts` (query builder UTC/WGS84, view state 3 trạng thái, SSE reducer, popup 6 trường) và các hàm bản đồ có sẵn trong `map-data.ts` (radius/color/opacity, haversine, lọc theo filter).
- **Ràng buộc GDMAS liên quan:**
  - [x] Tách biệt 7 Terminals (I1 — FE chỉ gọi T6 qua service, không nhúng worker/DB).
  - [x] Chuẩn **UTC** (`start_time`/`end_time` ISO 8601 `Z`) & tọa độ **WGS84** (`latitude`, `longitude`) (I3).
  - [x] Không fallback về dữ liệu mock tĩnh khi DB rỗng (I5 / Kịch bản Demo §4).
  - [x] Unit test chạy **offline 100%** (không fetch/EventSource thật — I7).
  - [x] `map-data.ts` / file thuần **không import `leaflet`** (kiểm tra bằng đọc source trong test).

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- **Môi trường / Mock:** `node --test` + TypeScript type stripping; không DOM, không mạng. Gọi trực tiếp hàm thuần với fixture lấy từ `contracts/examples/earthquake_sample.json` và bbox/now cố định để test tất định.
```json
{
  "sample_event": {
    "id": 1042,
    "source_event_id": "us7000m8v8",
    "event_time": "2026-11-06T15:30:00Z",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "depth_km": 10.5,
    "magnitude": 4.2,
    "place": "12 km NE of San Francisco, CA",
    "source_url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000m8v8"
  },
  "viewport": { "north": 40.0, "south": 35.0, "east": -120.0, "west": -125.0 },
  "now": "2026-11-21T00:00:00Z"
}
```

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi (Assertions) | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Happy Path — buildEarthquakeQuery | Functional | Filters mặc định + viewport mẫu | `start_time`/`end_time` ISO `Z` theo preset 7d; bbox `min_lat=-.../max_lat/...` đúng WGS84; `min_magnitude=2.5`; `sort_by=magnitude`, `order=desc` | PASS |
| `TC-02` | Empty DB (Demo §4) | Resilience | `deriveMapState(false, null, [])` + `applySseEvent([], database_cleared)` | `"empty"`; mảng marker `[]`; không có mock/fallback; popupFields thiếu → `"—"` | PASS |
| `TC-03` | Boundary UTC & WGS84 | Boundary | Sample `37.7749, -122.4194`; bbox vượt ±90/±180; preset `24h` | `formatCoordinate` → `"37.7749° N, 122.4194° W"`; bbox kẹp/wrap đúng; `timeRangeBounds` trả `...Z`; `isWgs84` biên đúng | PASS |
| `TC-04` | Error / Exception Handling | Negative | `deriveMapState(false, ApiError(500), [])`; SSE payload dị biệt | `"error"`; `applySseEvent` bỏ event không hợp lệ, không throw; field thiếu → `"—"` | PASS |
| `TC-05` | SSE thêm/dedupe marker | Functional | `earthquake_detected` 2 lần cùng `source_event_id` | Marker được thêm 1 lần (dedupe theo `source_event_id`); `database_cleared` trả `[]` | PASS |
| `TC-06` | Style marker theo magnitude/depth | Functional | `markerStyleFor(sample)` | `radius = magnitudeToRadius(4.2)`, `fillColor = "#facc15"`, `fillOpacity = depthToOpacity(10.5)`; không tự tính lại | PASS |
| `TC-07` | Haversine & filter thời gian | Functional | `haversineKm` giữa 2 điểm mẫu; `filterEarthquakes` theo preset | Khoảng cách ≈ trị số kỳ vọng; event ngoài khoảng bị loại; thứ tự giữ nguyên | PASS |
| `TC-08` | Popup đủ 6 trường | Functional | `popupFields(sample)` | Có đủ `place`, `source_event_id`, `event_time` (UTC + local), `depth_km`, `magnitude`, `source_url` | PASS |
| `TC-09` | Không import leaflet trong file thuần | Resilience | Đọc source `map-data.ts`, `map-types.ts`, `monitoring-view.ts` | Không chứa `from "leaflet"` / `from "react-leaflet"` → test offline chạy được | PASS |
| `TC-10` | HUD tọa độ tâm thực | Functional | `centerLabel({latitude, longitude, zoom})` | Dùng `formatCoordinate`, không hardcode `16.0544° N...`; invalid → `"—"` | PASS |
| `TC-13` | Quốc gia/khu vực từ `place` | Functional | `countryFromPlace("12 km NE of San Francisco, CA")`; `regionFromPlace`; `regionsFromItems` | Quốc gia = `"USA"` (bổ sung pattern mã bang); khu vực = `"San Francisco, CA"`; `regionsFromItems` unique/sort; null → `"Khác"` | PASS |
| `TC-14` | Lọc marker theo quốc gia + khu vực | Functional | `filterItemsByCountry` + `filterItemsByRegion` trên sample + SSE event nước khác | Chỉ giữ marker thuộc quốc gia/khu vực đã chọn; `ALL_REGIONS` trả toàn bộ quốc gia | PASS |
| `TC-15` | Query bỏ bbox khi chọn cụ thể | Functional | `buildEarthquakeQuery(filters, bbox)` với `country != all` | Không có `min_lat/max_lat/min_lon/max_lon`; `limit ≤ 100` (BE `le=100`); vẫn UTC `Z` | PASS |
| `TC-16` | Empty state 200/`success:false` (B1 audit) | Resilience | `isApiEmptyEnvelope({success:false,data:null,message})` + `fetchApi` giả lập 200 | Không ném `ApiError`; trả envelope rỗng; `getEarthquakes` → `data: []`, metadata mặc định → UI Empty | PASS |
| `TC-17` | Đồng bộ URL selection | Functional | parse/serialize `?country=Japan&region=Honshu`; param lạ | Hook trả đúng cặp; giá trị lạ → `all`; không làm thay đổi route | PASS |
| `TC-18` | Nhãn Độ lớn & chú giải màu | Functional | `magnitudeLevelLabel(3.9/4.2/5.5/6.1/NaN)`; source `MapLegend.tsx` | `"Yếu"/"Trung bình"/"Mạnh"/"Rất mạnh"/"Không rõ"`; legend dùng `magnitudeToColor`, không hardcode màu; UI không còn chữ "Magnitude" | PASS |
| `TC-19` | Cụm quốc gia/khu vực thuần | Functional | `buildRegionClusters` với sample Honshu/CA/USA/null | Gom đúng cặp quốc gia-khu vực, đếm sự kiện, avg/max magnitude; magnitude hỏng → null | PASS |
| `TC-20` | Mock cụm cho panel lọc | Functional | `getMockRegionClusters()` / `fetchRegionClusters()` | Có cụm Japan/Honshu (21 sự kiện), shape đúng để sau này thay bằng API BE | PASS |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/web && pnpm test                      # node --test tests/*.test.ts (toàn bộ, offline)
cd apps/web && node --test tests/monitoring-map.test.ts
cd apps/web && pnpm build                     # tsc -b && vite build
cd /run/media/leducthien/workspace/KHDLKPDL/GDMAS && python3 scripts/notes_index.py --check
```

- **Ngày chạy cuối:** `2026-11-21` *(vòng 2 — TC-01…TC-18 đều đã chạy)*
- **Kết quả quan sát thật:** `node --test tests/monitoring-map.test.ts` → 10/10 pass (TC-01…TC-10). Bổ sung `TC-11` (geo-format) + `TC-12` (map-data) pass. `cd apps/web && pnpm test` → **101/101 pass, 0 fail**. `cd apps/web && pnpm build` → sạch (`tsc -b && vite build`, 2142 modules, dist tạo thành công). `python3 scripts/notes_index.py --check` → OK. Trong lúc chạy đã phát hiện 2 lỗi nhỏ ngay trong code/test mới (import `React` thừa trong `MapControlsPanel.tsx`, thiếu import `markerStyleFor` trong `map-data.test.ts`) và đã sửa trước khi chốt kết quả — không phát sinh bug sản phẩm, không tạo bug log.
- **Vòng 2 (Revision 2026-11-21):** `node --test tests/region-filter.test.ts tests/catalog-selection.test.ts tests/monitoring-map.test.ts` → TC-13…TC-18 pass (tổng 13/13 + 2/2 + 13/13). `cd apps/web && pnpm test` → **108/108 pass, 0 fail**. `pnpm build` → sạch (2145 modules). Đã sửa: aside tự thu trên `/monitoring`, suy quốc gia/khu vực từ `place` (mã bang Mỹ → USA), đồng bộ URL 2 trang, `MapLegend`, `MAP_PAGE_SIZE=100` (BE `le=100`), empty envelope B1 không còn ném ApiError, `raw_data`/`details` type khớp BE. B2 (`/clusters` thiếu `dominant_place`) vẫn chờ BE — FE đã có fallback `"Khác"`.

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- `none` *(nếu phát hiện lỗi khi chạy unit test, tạo `BUG-<handle>-NNN-<slug>.md` trong `.agents/notes/bugs/` và liệt kê ID + tóm tắt tại đây).*
- Audit FE↔BE (§4.9 proposal) phát hiện B1/O2/C1/C2/C4/C5 — là lỗi hợp đồng/runtime, sẽ sửa ở vòng 2 (không phải lỗi test, nên không tạo bug log). B2 (`/clusters` thiếu `dominant_place`) cần chủ vùng `van` xử lý riêng.
