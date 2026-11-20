# Testcase: Viết lại task Frontend theo mô hình 7 Terminals

## Metadata
- ID: 2026-11-20-fe-task-thien-7-terminals-thien
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-20-fe-task-thien-7-terminals-thien.md
- Target: docs/task/thien.md
- Test File: N/A (docs-only)
- Author: agent | thien
- Created: 2026-11-20
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng kiểm chứng:** cấu trúc và nội dung của `docs/task/thien.md` sau khi viết lại — đủ 7 terminal, 6 pattern, 6 bước demo, 14 task nhỏ, không còn tham chiếu component đã xóa.
- **Ràng buộc:** docs-only → không cần file unit test; kiểm chứng bằng grep cấu trúc + `notes_index.py --check`. Không đọc `docs/guides/`.

---

## 2. Ma trận Kịch bản Test Cases

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Đủ 7 Terminals | Structural | grep `T1`…`T7` trong ma trận | Cả 7 terminal xuất hiện và gắn task T7 | `PASSED` |
| `TC-02` | Đủ 6 Patterns | Structural | grep tên 6 pattern | Temporal, Trend, Seasonality, Correlation, Forecast, Classification | `PASSED` |
| `TC-03` | Đủ 14 task | Structural | grep `### Task T7.` | T7.01 → T7.14 | `PASSED` |
| `TC-04` | Demo 6 bước | Structural | grep mục Demo | Có 6 bước theo `yeucaubatbuoc.md` §4 | `PASSED` |
| `TC-05` | Không drift component cũ | Negative | grep tên file đã xóa | Không còn `DashboardOverviewPage`, `StatisticsPage` cũ dạng path import | `PASSED` |
| `TC-06` | Nhất quán notes | Tooling | `python3 scripts/notes_index.py --check` | exit 0 | `PASSED` |

---

## 3. Lệnh thực thi & Kết quả thực tế

```bash
grep -c "### Task T7\." docs/task/thien.md
grep -n "docs/guides" .agents/notes/implemented/2026-11-20-fe-task-thien-7-terminals-thien/plan.md
python3 scripts/notes_index.py --check
```

- **Ngày chạy cuối:** 2026-11-20
- **Kết quả:** 14 task; notes check OK; không phát hiện lỗi.

---

## 4. Lỗi phát hiện & Bug Logs
- `none`
