# Testcase: Trang Danh mục động đất với bộ lọc thời gian & độ lớn (T7.03)

## Metadata
- ID: 2026-11-20-earthquakes-catalog-filter-thien
- Mode: single-file-test
- Proposal: none
- Target: `apps/web/src/features/earthquakes/`, `apps/web/src/app/App.tsx`
- Test File: apps/web/tests/earthquakes-page.test.ts
- Author: agent | thien
- Created: 2026-11-20
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng:** helper query/state/format/fetch của trang danh mục; component chỉ render.
- **Ràng buộc:**
  - [x] UTC ISO 8601 `Z` cho `start_time`/`end_time`, WGS84 cho bbox (I3).
  - [x] 3 trạng thái Loading/Error/Empty, DB rỗng không fallback mock (I5).
  - [x] Test offline 100%, mock fetcher (I7); không DOM/mạng thật.

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- `node --test` + type stripping; fetcher注入 trả `EarthquakeListResponse` hoặc ném `ApiError`.

```json
{
  "success": true,
  "data": [{ "id": 1, "event_time": "2026-11-20T00:00:00Z", "latitude": 16.0, "longitude": 108.0, "depth_km": 10, "magnitude": 5.2, "place": "test" }],
  "metadata": { "total": 1, "page": 1, "limit": 20, "total_pages": 1 }
}
```

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Query params | Functional | filter day/week/month + mag/depth + sort/page | `start_time`/`end_time` có `Z`; đúng key `min_magnitude`, `min_depth`, `sort_by`, `order`, `page`, `limit` | `PASSED` |
| `TC-02` | Khoảng ngày UTC | Boundary | day/week/month | `start <= end`, UTC `Z`, chênh đúng 1 ngày/7 ngày/1 tháng | `PASSED` |
| `TC-03` | Loading state | Functional | `loading=true` | `deriveViewState` = loading | `PASSED` |
| `TC-04` | Error state | Negative | `error instanceof ApiError` | `deriveViewState` = error; giữ message/status để Retry | `PASSED` |
| `TC-05` | Empty state | Resilience | data `[]`, metadata.total=0 | `deriveViewState` = empty; không fallback mock | `PASSED` |
| `TC-06` | Ready state | Functional | data có 1 item | `deriveViewState` = ready | `PASSED` |
| `TC-07` | fetchPage mock | Integration-offline | fetcher trả success/empty/throw | `fetchPage` trả result hoặc lỗi; không gọi mạng thật | `PASSED` |
| `TC-08` | Format row | Boundary | item WGS84 hợp lệ / tọa độ lỗi | `formatEventRow` giữ UTC text và `"—"` khi sai tọa độ | `PASSED` |
| `TC-09` | Reset page | Functional | đổi filter | Query builder nhận page=1 từ caller; test khẳng định giá trị truyền vào | `PASSED` |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/web && pnpm build
cd apps/web && pnpm test
python3 scripts/notes_index.py --check
```

- **Ngày chạy cuối:** 2026-11-20
- **Kết quả quan sát thật:** `pnpm build` OK; `pnpm test` 69/69 pass (baseline 63 + 6 TC mới); `notes_index.py --check` OK.

---

## 5. Lỗi phát hiện & Bug Logs
- `none`
