<!-- Template cho .agents/notes/testcase/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này. -->

# Testcase: Monitoring — 1 trận mới nhất theo vùng & refresh có lọc

## Metadata
- ID: 2026-11-24-monitoring-region-latest-refresh-thien
- Mode: single-file-test
- Proposal: none
- Target: `apps/web/src/features/monitoring/{monitoring-view,MonitoringMapPage}.ts(x)`
- Test File: `apps/web/tests/monitoring-region-map.test.ts`, `apps/web/tests/monitoring-map-ux.test.ts`
- Author: agent | thien
- Created: 2026-11-24
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng:** `latestEventInRegion` thuần; refreshVersion gộp SSE + timer + đổi filter; focus vào event đã chọn.
- **Ràng buộc:** I1 (FE/T7), I2 (giữ helper cũ), I3 (UTC/WGS84), I5 (không mock), I7 (offline).

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu
- Fixture 3 event cùng country Japan/region Honshu với `event_time` 01:00Z, 03:00Z, timestamp hỏng; 1 event region khác.

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên | Nhóm | Đầu vào | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Region → đúng 1 event mới nhất | Functional | 3 event Honshu | Trả `[event 03:00Z]` | `PASSED` |
| `TC-02` | Timestamp hỏng & tie | Boundary | event_time hỏng / bằng nhau | Hỏng cuối; tie theo `source_event_id` | `PASSED` |
| `TC-03` | ALL_REGIONS giữ nguyên | Regression | region=all | Trả đủ danh sách đã sort | `PASSED` |
| `TC-04` | Refresh có lọc | Structural | Đọc `MonitoringMapPage.tsx` | Có `refreshVersion`, fetch theo `params` có country/region, `setEvents` thay thế | `PASSED` |

---

## 4. Lệnh thực thi & Kết quả thực tế
```bash
cd apps/web && pnpm build && pnpm test
python3 scripts/notes_index.py --check
```
- **Ngày chạy cuối:** `2026-11-24`
- **Kết quả quan sát thật:** `pnpm build` PASS; `pnpm test` **362 / 0 fail**; `notes_index.py --check` OK. Không test nào bị xoá/skip.

---

## 5. Lỗi phát hiện & Bug Logs
- `none`
