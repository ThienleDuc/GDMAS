<!-- Template cho .agents/notes/testcase/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này. -->

# Testcase: 3 biểu đồ Biểu diễn thời gian lọc đúng Ngày/Tuần/Tháng

## Metadata
- ID: 2026-11-24-temporal-charts-window-thien
- Mode: single-file-test
- Proposal: none
- Target: `apps/api/src/gdmas/api/routes/analysis.py`
- Test File: `apps/api/tests/unit/test_analysis_query_params.py`
- Author: agent | thien
- Created: 2026-11-24
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng:** `/analysis/temporal` với `start_time/end_time` → 3 mảng line/scatter/histogram cùng nguồn đã lọc.
- **Ràng buộc:** I1 (BE route), I2 (giữ chữ ký/build), I3 (UTC), I5 (không mock), I7 (offline).

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu
- Fixture 3 sự kiện: 2 trong cửa sổ `2026-11-20 → 2026-11-24`, 1 ngoài `2026-11-01`.

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên | Nhóm | Đầu vào | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Có cửa sổ → on-the-fly | Functional | `interval=day/week/month` + start/end | `data_points` chỉ đếm 2 event trong cửa sổ | `PASSED` |
| `TC-02` | 3 mảng cùng nguồn | Functional | Response trên | `line_chart`, `scatter_plot`, `histogram` đều chỉ chứa event trong cửa sổ | `PASSED` |
| `TC-03` | Không window → snapshot | Regression | Không start/end, không filter | Vẫn đi `_respond()` như cũ (không crash) | `PASSED` |

---

## 4. Lệnh thực thi & Kết quả thực tế
```bash
cd apps/api && uv run python -m pytest -q && uv run ruff check . && uv run ruff format --check .
cd apps/web && pnpm build && pnpm test
python3 scripts/notes_index.py --check
```
- **Ngày chạy cuối:** `2026-11-24`
- **Kết quả quan sát thật:** BE `uv run python -m pytest -q` → **380 passed**, ruff sạch; FE `pnpm build` PASS + `pnpm test` **364 / 0 fail**; `notes_index.py --check` OK. Không test nào bị xoá/skip.

---

## 5. Lỗi phát hiện & Bug Logs
- `none`
