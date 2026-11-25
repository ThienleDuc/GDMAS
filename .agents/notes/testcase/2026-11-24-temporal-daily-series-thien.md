<!-- Template cho .agents/notes/testcase/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này. -->

# Testcase: Temporal luôn vẽ chuỗi theo ngày

## Metadata
- ID: 2026-11-24-temporal-daily-series-thien
- Mode: single-file-test
- Proposal: none
- Target: `apps/web/src/features/statistics/statistics-data.tsx`
- Test File: test statistics FE bổ sung
- Author: agent | thien
- Created: 2026-11-24
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng:** `/analysis/temporal` luôn gửi `interval=day`, cửa sổ theo chip.
- **Ràng buộc:** I2 (giữ context/chip), I3 (UTC), I7 (offline).

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu
- Đọc source `statistics-data.tsx`, không mạng.

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên | Nhóm | Đầu vào | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Luôn gửi interval=day | Structural | Đọc source | `getTemporalAnalysis({ interval: "day", ...window, ...geo }` | `PASSED` |
| `TC-02` | Cửa sổ vẫn theo chip | Regression | Đọc source | deps `[interval, window, country, region]`, `intervalToParams(interval)` giữ nguyên | `PASSED` |
| `TC-03` | Ngày = hôm qua + hôm nay | Functional | `intervalToParams("day", 2026-11-21T15:30Z)` | `start_time = 2026-11-20T00:00:00Z`, `end_time = 2026-11-21T15:30:00Z` → 2 phiên ngày | `PASSED` |

---

## 4. Lệnh thực thi & Kết quả thực tế
```bash
cd apps/web && pnpm build && pnpm test
python3 scripts/notes_index.py --check
```
- **Ngày chạy cuối:** `2026-11-24`
- **Kết quả quan sát thật:** `pnpm build` PASS; `pnpm test` **366 / 0 fail**; `notes_index.py --check` OK. Không test nào bị xoá/skip.
- **Vòng 2:** `intervalToParams("day")` đổi từ "24h trước" sang "00:00 hôm qua → hiện tại" → luôn 2 phiên ngày; test `TC-01b` bổ sung.

---

## 5. Lỗi phát hiện & Bug Logs
- `none`
