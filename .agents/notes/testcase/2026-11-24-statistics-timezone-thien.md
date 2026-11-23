<!-- Template cho .agents/notes/testcase/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này. -->

# Testcase: Statistics nhận UTC/UTC+7 từ header

## Metadata
- ID: 2026-11-24-statistics-timezone-thien
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-24-statistics-timezone-thien.md
- Target: `apps/web/src/features/statistics/`, `apps/web/src/components/charts/TemporalPatternCharts.tsx`
- Test File: `apps/web/tests/statistics-view.test.ts` bổ sung
- Author: agent | thien
- Created: 2026-11-24
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng:** timezone từ context → nhãn ngày trên chart/page/insight.
- **Ràng buộc:** I2 (props optional), I3 (UTC lưu trữ), I7 (offline).

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu
- `formatStatDate("2026-11-21", "UTC")` / `"UTC+7"`; NOW cố định.

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên | Nhóm | Đầu vào | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | formatStatDate 2 mode | Functional | ngày `2026-11-21` | Khác nhau đúng 7h, có hậu tố mode | `PASSED` |
| `TC-02` | Giá trị lạ | Boundary | `null`, `"abc"` | `"—"` / giữ nguyên, không crash | `PASSED` |
| `TC-03` | Context có timezone | Structural | Đọc `statistics-data.tsx` | `useTimezone()` + field `timezone` | `PASSED` |
| `TC-04` | Chart nhận prop | Structural | Đọc page + chart | `timezone` truyền vào `TemporalPatternCharts`, dùng `formatStatDate` | `PASSED` |

---

## 4. Lệnh thực thi & Kết quả thực tế
```bash
cd apps/web && pnpm build && pnpm test
python3 scripts/notes_index.py --check
```
- **Ngày chạy cuối:** `2026-11-24`
- **Kết quả quan sát thật:** `pnpm build` PASS; `pnpm test` **368 / 0 fail**; `notes_index.py --check` OK. Không test nào bị xoá/skip.

---

## 5. Lỗi phát hiện & Bug Logs
- `none`
