<!-- Template cho .agents/notes/testcase/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này. -->

# Testcase: Temporal bucket theo UTC/UTC+7

## Metadata
- ID: 2026-11-24-temporal-timezone-buckets-thien
- Mode: single-file-test
- Proposal: none
- Target: `apps/api/src/gdmas/services/analysis/patterns.py`, `/analysis/temporal`, FE service
- Test File: `apps/api/tests/unit/test_analysis_temporal_window.py`, FE test bổ sung
- Author: agent | thien
- Created: 2026-11-24
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng:** bucket ngày theo timezone; UTC+7 ngày 24, UTC ngày 23 cho event 20:00Z.
- **Ràng buộc:** I2 (default UTC), I3 (lưu UTC), I7 (offline).

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu
- Event `2026-11-23T20:00:00Z`; window `2026-11-23T00:00Z → 2026-11-25T00:00Z`.

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên | Nhóm | Đầu vào | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | UTC giữ ngày 23 | Functional | `timezone=UTC` | `line_chart[].date` chứa `2026-11-23` | `NOT_RUN` |
| `TC-02` | UTC+7 sang ngày 24 | Functional | `timezone=UTC+7` | `line_chart[].date` chứa `2026-11-24`, không còn 23 | `NOT_RUN` |
| `TC-03` | Scatter vẫn UTC | Regression | Response trên | `scatter_plot[].timestamp` kết thúc `Z` | `NOT_RUN` |
| `TC-04` | FE gửi timezone | Structural | Đọc source | `getTemporalAnalysis` có `timezone`, deps có `timezone` | `PASSED` |
| `TC-05` | Nhãn chỉ giữ ngày | Functional | `formatStatDate` 2 mode | Không có `HH:mm`, vẫn có hậu tố mode | `PASSED` |

---

## 4. Lệnh thực thi & Kết quả thực tế
```bash
cd apps/api && uv run python -m pytest -q && uv run ruff check . && uv run ruff format --check .
cd apps/web && pnpm build && pnpm test
python3 scripts/notes_index.py --check
```
- **Ngày chạy cuối:** `2026-11-24`
- **Kết quả quan sát thật:** BE `uv run python -m pytest -q` → **382 passed** (snapshot OpenAPI cập nhật cho query param), ruff sạch; FE `pnpm build` PASS + `pnpm test` **368 / 0 fail**; `notes_index.py --check` OK. Không test nào bị xoá/skip.
- **Vòng 2:** `formatStatDate` chỉ giữ ngày (bỏ giờ), giữ hậu tố UTC/(UTC+7).

---

## 5. Lỗi phát hiện & Bug Logs
- `none`
