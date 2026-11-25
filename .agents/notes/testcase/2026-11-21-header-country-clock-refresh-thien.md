# Testcase: Header toàn cục & điều hướng aside rút gọn (FE-only)

## Metadata
- ID: 2026-11-21-header-country-clock-refresh-thien
- Mode: single-file-test
- Proposal: none
- Target: `apps/web/src/layouts/{navigation.ts,DashboardLayout.tsx,header/}`, `apps/web/src/utils/timezone.ts`
- Test File: `apps/web/tests/header-global.test.ts`, `apps/web/tests/layout-navigation.test.ts`, `apps/web/tests/layout-styles.test.ts`
- Author: agent | thien
- Created: 2026-11-21
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng kiểm chứng:** (1) `NAV_META` chỉ còn 4 route hợp lệ; (2) `countriesFromClusters` suy danh mục quốc gia từ payload `GET /api/v1/clusters`; (3) `formatClockTime` UTC / UTC+7 với mốc cố định; (4) đồng hồ đếm ngược 5 phút (`nextCountdownTick` / `countdownLabel`) — về 0 thì reset, không phụ thuộc trạng thái SSE; (5) `parseSelection`/`selectionToParams` làm nguồn sự thật chung; (6) toast báo cập nhật tự đóng sau 5 giây (`nextToastTick`) — khi countdown về 0 gọi `sse.reconnect()` để lấy sự kiện mới.
- **Ràng buộc GDMAS liên quan:**
  - [x] Tách biệt 7 Terminals (I1 — chỉ là FE shell, không worker)
  - [x] Chuẩn **UTC** (ISO 8601 `Z`) & tọa độ **WGS84** (I3)
  - [x] Không fallback mock khi DB rỗng / API 404 (I5)
  - [x] Unit test chạy **offline 100%** — không gọi mạng USGS/BE (I7)
  - [x] Giữ chữ ký hàm cũ, chỉ thêm (I2)

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- **Môi trường / Mock:** `node:test` thuần, không DOM; timestamp cố định `2026-11-21T12:00:00Z`; tọa độ WGS84 hợp lệ; payload cụm canonical (không mock mạng).
```json
{
  "clusters_payload": {
    "success": true,
    "data": {
      "clusters": [
        { "cluster_id": 1, "center_latitude": 38.29, "center_longitude": 142.38, "event_count": 5, "avg_magnitude": 5.8, "max_magnitude": 6.4, "dominant_place": "Honshu, Japan" },
        { "cluster_id": 2, "center_latitude": -6.2, "center_longitude": 106.8, "event_count": 3, "avg_magnitude": 4.9, "max_magnitude": 5.1, "dominant_place": "Java, Indonesia" },
        { "cluster_id": 3, "center_latitude": 35.7, "center_longitude": -118.5, "event_count": 3, "avg_magnitude": 4.2, "max_magnitude": 4.7, "dominant_place": "California, USA" }
      ]
    }
  },
  "fixed_now": "2026-11-21T12:00:00Z"
}
```

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi (Assertions) | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Điều hướng chỉ còn 4 route hợp lệ | Functional | Đọc `NAV_META`, gọi `routeLabel` | paths = `["/","/monitoring","/earthquakes","/statistics"]`; `routeLabel("/reports")` = `"Trang"`; `routeLabel("/settings")` = `"Trang"` | `PASS` |
| `TC-02` | Breadcrumb route con vẫn đúng | Functional | `navMetaFor("/monitoring/chi-tiet")` | trả meta "Bản đồ Giám sát"; badge "Trực tiếp" | `PASS` |
| `TC-03` | Danh mục quốc gia từ cụm API | Happy Path | `countriesFromClusters(clusters_payload)` | `["Japan","Indonesia","USA"]` (sort theo event_count giảm, cùng count sort tên); mỗi item có `country`, `eventCount`, `clusterIds` | `PASS` |
| `TC-04` | Payload rỗng / DB rỗng | Resilience | `countriesFromClusters({success:true,data:{clusters:[]}})` | trả `[]`, không throw, không sinh quốc gia giả | `PASS` |
| `TC-05` | API 404 → unavailable | Negative | `countriesFromClusters(null)` / payload unavailable | trả `[]`, không fallback mock, không throw | `PASS` |
| `TC-06` | Đồng hồ UTC | Boundary | `formatClockTime(new Date("2026-11-21T12:00:00Z"), "UTC")` | chứa `12:00:00` và `UTC`; không lệch múi giờ | `PASS` |
| `TC-07` | Đồng hồ UTC+7 | Boundary | cùng mốc, mode `"UTC+7"` | chứa `19:00:00` và `UTC+7` (Asia/Ho_Chi_Minh) | `PASS` |
| `TC-08` | Đồng hồ đếm ngược 5 phút | Functional | `REFRESH_CYCLE_SECONDS`, `nextCountdownTick`, `countdownLabel` | 300s → `"05:00"`; giảm 1s; về 0/NaN → reset 300s → `"05:00"`; không đụng SSE | `PASS` |
| `TC-09` | Nguồn sự thật URL `?country=` | Functional | `selectionToParams({country:"Japan",region:"all"})` → `parseSelection(...)` | round-trip trả `{country:"Japan",region:"all"}`; `"all"` → xóa param | `PASS` |
| `TC-10` | CSS header actions tồn tại | Functional | đọc `layout.css` | có `.layout__header-actions` + widget classes + `.layout__refresh-toast` (`--z-toast`), progress bar (`--countdown-progress` / `--toast-progress`), keyframes + `prefers-reduced-motion`, dùng `var(--...)` (Dark Mode, không hex) | `PASS` |
| `TC-11` | Toast cập nhật tự đóng sau 5s | Functional | `TOAST_SECONDS`, `nextToastTick` | 5 → 4 → … → 1 → 0 rồi dừng; NaN/âm → 0; countdown về 0 gọi `reconnect()` + mở toast | `PASS` |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/web && pnpm test
cd apps/web && pnpm build
```

- **Ngày chạy cuối:** `2026-11-21`
- **Kết quả quan sát thật:**
  - `cd apps/web && pnpm test` → **152/152 pass, 0 fail** (trong đó `header-global.test.ts` 8/8 pass — TC-08 đếm ngược/reset, TC-11 toast 5s; `layout-navigation.test.ts` + `layout-styles.test.ts` cập nhật đều pass).
  - `cd apps/web && pnpm build` → `tsc -b && vite build` **PASS** (2556 modules, 876ms).
  - `python3 scripts/notes_index.py --check` → **OK**.
  - `git status --porcelain` → không có file bị xóa (`D`) ngoài ý muốn; chỉ 2 route/nav entry bị gỡ theo plan.

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- `none` *(cập nhật sau khi chạy test thật)*
