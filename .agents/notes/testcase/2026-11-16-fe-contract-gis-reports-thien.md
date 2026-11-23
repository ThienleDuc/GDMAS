# Testcase: Hợp đồng BE↔FE + GIS Map, Reports, Settings, Services/SSE (Task 2–4)

## Metadata
- ID: 2026-11-16-fe-contract-gis-reports-thien
- Mode: single-file-test
- Proposal: none
- Target: `apps/web/src/services/earthquake-api.ts`, `apps/web/src/hooks/useSSE.ts`, `apps/web/src/components/map/map-data.ts`, `apps/web/src/features/settings/settings-data.ts`, `apps/web/src/utils/timezone.ts`, `apps/web/src/features/{monitoring,reports,settings}/`
- Test File: `apps/web/tests/{services,map-data,sse-machine,settings-data,geo-format}.test.ts`, `apps/web/tests/ui/{empty-state,reports,settings,map-panel}.test.tsx`
- Author: agent | thien
- Created: 2026-11-16
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng kiểm chứng:**
  - Lớp services: URL + query params (`start_time`, `end_time`, bounding box WGS84), xử lý 404 → `unavailable` (không mock), parse payload canonical + alias legacy.
  - `useSSE`: state machine `connecting → open → reconnecting → disconnected`, backoff có giới hạn, nghe hợp 2 bộ tên event (`earthquake_detected`/`earthquake_alert`, `ingestion_cycle_completed`, `database_cleared`), cleanup khi unmount.
  - `map-data.ts`: bán kính/màu marker theo `magnitude`, opacity theo `depth_km`, chuẩn hoá cụm canonical + legacy, haversine, viewport → bbox.
  - `settings-data.ts`: đánh giá freshness theo `docs/architecture.md` §9.4 (5 phút: >15m stale, >60m interrupted; 1 ngày: >26h stale).
  - UI: Empty State khi DB rỗng (Demo Bước 2/3), banner `database_cleared`, Reports đúng 6 pattern tên chuỗi thời gian, Settings đủ 7 Terminals, popup bản đồ có `place`/`source_event_id`/UTC.
- **Ràng buộc GDMAS liên quan:**
  - [x] Tách biệt 7 Terminals (I1 — chỉ chạm T7 Frontend, không worker).
  - [x] Chuẩn **UTC** (`TIMESTAMPTZ` / ISO 8601 `Z`) & tọa độ **WGS84** (`latitude`, `longitude`) (I3).
  - [x] Không fallback về dữ liệu mock tĩnh khi DB rỗng (I5 / kịch bản Demo §4).
  - [x] Unit test chạy **offline 100%** (mock `fetch`, `EventSource`, không gọi mạng — I7).
  - [x] Giữ nguyên 12 test `apps/web/tests/chart-data.test.ts` đang pass (I7).

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- **Môi trường:** Node 22 (`node:test` + `node:assert/strict`) cho test thuần; Vitest + jsdom + `@testing-library/react` cho test TSX.
- **Fixture offline:** `contracts/examples/{earthquake,patterns,clusters,system_status,analysis,predictions,classifications,health}_sample.json`
- **Mock `fetch`:** trả fixture theo URL; nhánh 404 → `{ ok: false, status: 404 }`.
- **Mock `EventSource`:** class giả ghi lại URL, cho phép `emit(event, data)` và `triggerError()`.
- **Payload mẫu (UTC & WGS84):**
```json
{
  "cluster": {
    "cluster_id": 1,
    "center_latitude": 37.7749,
    "center_longitude": -122.4194,
    "event_count": 45,
    "avg_magnitude": 3.2,
    "max_magnitude": 5.1,
    "radius_km": 120
  },
  "legacy_cluster": { "id": 1, "name": "San Andreas", "lat": 35.2, "lon": -119.5, "events_count": 45, "avg_mag": 2.8 },
  "service": { "status": "active", "last_run": "2026-11-16T10:00:00Z", "cycle": "5m" }
}
```

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi (Assertions) | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Contract JSON parse được | Contract | Parse 6 schema + 6 example mới | Tất cả parse thành công; schema có `$id`; example timestamp kết thúc `Z` | `PASSED` |
| `TC-02` | `sse-event.json` additive | Contract | So enum trước/sau | Enum cũ `earthquake_detected/heartbeat/alert` còn nguyên; thêm `ingestion_cycle_completed`, `database_cleared`, `earthquake_alert` | `PASSED` |
| `TC-03` | Clusters canonical | Services | Mock GET `/api/v1/clusters` trả fixture canonical | Trả `ClusterSummary[]` đúng `cluster_id`/`center_latitude`/`center_longitude`/`event_count`/`avg_magnitude` | `PASSED` |
| `TC-04` | Clusters alias legacy | Services | Mock trả `clustering_summary` (`id/lat/lon/events_count/avg_mag`) | Adapter map sang canonical; không `NaN`/`undefined` | `PASSED` |
| `TC-05` | Query params mở rộng | Services | `getEarthquakes({start_time,end_time,min_lat,max_lat,min_lon,max_lon,limit})` | URL chứa đủ 6 param ISO/bbox, `encodeURIComponent` đúng; bỏ param `undefined` | `PASSED` |
| `TC-06` | 404 → `unavailable` | Resilience | Mock `/system/status` trả 404 | `getOptionalApi` trả `{data: null, unavailable: true}`, **không throw**, không trả mock | `PASSED` |
| `TC-07` | Lỗi 500 vẫn throw | Negative | Mock trả 500 | `ApiError` ném ra với `status/body` | `PASSED` |
| `TC-08` | Bán kính & màu marker | Functional | magnitude 2.5, 4.0, 5.5, 6.8 | Bán kính tăng đơn điệu trong khoảng 4–9 px; màu theo ngưỡng ≥6/5–6/4–5/<4; `NaN` → giá trị mặc định an toàn | `PASSED` |
| `TC-09` | Opacity theo độ sâu | Boundary | `depth_km` 0, 70, 300, `null` | Opacity trong [0.35, 1]; sâu hơn → nhạt hơn; `null` → mặc định | `PASSED` |
| `TC-10` | Chuẩn hoá cụm canonical | Functional | Fixture canonical | Map đúng `center_latitude/center_longitude/event_count/avg_magnitude`; giữ `radius_km` | `PASSED` |
| `TC-11` | Chuẩn hoá cụm legacy | Boundary | `clustering_summary.clusters` legacy | Alias map đúng; `cluster_id` từ `id`; `name`/`dominant_place` giữ được | `PASSED` |
| `TC-12` | Haversine & bbox viewport | Functional | 2 điểm cách ~111 km; viewport có wrap kinh tuyến | `haversineKm` sai số < 1%; `viewportToBbox` kẹp `lat ∈ [-90,90]`, xử lý `lon` wrap | `PASSED` |
| `TC-13` | Filter marker | Functional | magnitude thấp hơn ngưỡng, thời gian ngoài khoảng | `shouldShowMarker` false tương ứng; đúng ngưỡng → true | `PASSED` |
| `TC-14` | Format WGS84 & UTC | Boundary | `16.0544/-108.2022`, `latitude=0`, `event_time` ISO `Z` | `formatCoordinate` → `16.0544° N, 108.2022° W`; `formatEventTime(...,"UTC")` chứa `UTC`/`Z` và không lệch múi giờ | `PASSED` |
| `TC-15` | SSE state machine | Functional | Mock `EventSource`: open → error → open | `status` chuyển `open` → `reconnecting` → `open`; `reconnectAttempt` tăng rồi reset 0 | `PASSED` |
| `TC-16` | SSE backoff có giới hạn | Boundary | 10 lần error liên tiếp | Delay theo cấp số nhân, chặn trần 30 s; `status` cuối `disconnected` khi vượt số lần tối đa | `PASSED` |
| `TC-17` | SSE event names | Functional | Emit `earthquake_alert`, `ingestion_cycle_completed`, `database_cleared` | `data.event` giữ nguyên; `lastEventTime` cập nhật; payload JSON hỏng không crash | `PASSED` |
| `TC-18` | SSE endpoint thứ hai | Functional | `useSSE("/api/v1/events/stream")` | `EventSource` được tạo đúng URL đó (không luôn dùng mặc định) | `PASSED` |
| `TC-19` | Freshness §9.4 | Boundary | `last_run` cách 5m, 16m, 61m; clustering 27h | `fresh` / `stale` / `interrupted` / `stale`; `last_run` thiếu → `unknown`; nhãn tiếng Việt đúng | `PASSED` |
| `TC-20` | Empty State khi DB rỗng | Resilience | Mock tất cả endpoint trả `data: []`/0 | Reports/Settings/Map hiển thị Empty State, **không** hiện `1,248`/`16` hay mảng mock | `PASSED` |
| `TC-21` | Banner `database_cleared` | Resilience | Mock `EventSource` phát `database_cleared` | Banner "CSDL đã bị xoá trống" hiển thị; `resetVersion` tăng | `PASSED` |
| `TC-22` | Refetch sau phục hồi | Resilience | Phát `database_cleared` rồi `ingestion_cycle_completed` | `fetch` được gọi lại (số lần tăng), dữ liệu hiển thị lại | `PASSED` |
| `TC-23` | Reports đúng 6 pattern | Functional | Mock `/patterns` | Bảng có đúng 6 tên: Temporal, Trend, Seasonality, Correlation, Dự báo t+1, Phân loại t+1; **không** còn Cyclic/Swarm/Quiet/Burst/Aftershock/Foreshock | `PASSED` |
| `TC-24` | Reports 404 `/system/status` | Resilience | Mock 404 cho `/system/status` | Hiện nhãn "BE chưa triển khai endpoint"; các phần khác vẫn render | `PASSED` |
| `TC-25` | Settings đủ 7 Terminals | Functional | Mock `/system/status` | Render đủ PostgreSQL, Ingestion, Analysis, Clustering, Prediction, Database API, Frontend + `last_run` | `PASSED` |
| `TC-26` | Settings chuyển múi giờ | Functional | Bấm toggle UTC ↔ Giờ địa phương | Nhãn giờ đổi theo `formatEventTime`; localStorage lưu `gdmas_timezone_mode` | `PASSED` |
| `TC-27` | Map popup chi tiết | Functional | Render popup với fixture earthquake | Có `place`, `source_event_id`, độ sâu, magnitude, thời gian UTC | `PASSED` |
| `TC-28` | Map HUD toạ độ động | Functional | Gọi `onViewportChange({lat,lng,zoom})` | HUD hiển thị toạ độ mới (WGS84), **không** còn hằng số `16.0544`/`108.2022` mặc định | `PASSED` |
| `TC-29` | Giữ 12 test cũ | Regression | `pnpm test` | 12 test `chart-data.test.ts` vẫn pass (I7) | `PASSED` |
| `TC-30` | Build sạch | Regression | `pnpm build` | `tsc -b && vite build` không lỗi type | `PASSED` |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/web && node --test tests/*.test.ts   # 34 pass / 0 fail
cd apps/web && npm test                     # 34 pass / 0 fail
cd apps/web && ./node_modules/.bin/tsc -b   # clean (0 error)
cd apps/web && ./node_modules/.bin/vite build # clean (dist built)
python3 -c "import json,glob;[json.load(open(p)) for p in glob.glob('contracts/**/*.json',recursive=True)]" # OK
python3 scripts/notes_index.py --check      # OK
```

- **Ngày chạy cuối:** 2026-11-17
- **Kết quả quan sát thật:** 34 tests pass, 0 fail; build sạch không cảnh báo TypeScript, toàn bộ contracts JSON hợp lệ.

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- `none`
