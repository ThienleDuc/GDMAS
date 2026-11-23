<!-- Template cho .agents/notes/implemented/yyyy-mm-dd-<slug>-<handle>/plan.md — chỉ tạo sau khi proposal §9 Approved. -->

# Implementation Plan: Chuẩn hóa độ chính xác dự báo ở BE

## Metadata
- ID: 2026-11-24-prediction-filtered-precision-thien
- Proposal: .agents/notes/proposed/2026-11-24-prediction-filtered-precision-thien.md
- Approved By: thien
- Approved At: 2026-11-24
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Chuẩn hóa `predicted`/`lower`/`upper` của **cả 2 đường BE** về đúng 3 chữ số thập phân thật (không đệm `000`); giữ nguyên field/schema/cơ chế on-the-fly.

---

## 2. Phạm vi
### In Scope
- `apps/api/src/gdmas/services/analysis/filtered.py` (`rounded_forecast` → 3 chữ số + dùng trong `build_filtered_forecast`)
- `apps/api/src/gdmas/services/prediction/service.py` (`round(..., 3)` cho 3 field snapshot)
- `apps/api/tests/unit/test_prediction_filtered_precision.py` (mới, offline)
- `.agents/notes/testcase/2026-11-24-prediction-filtered-precision-thien.md`

### Out of Scope
- `inference.py` (ARIMA/quantile/artifact), contracts, migration, FE, SSE, docs API (`service.py` chỉ đổi hệ số làm tròn)
- Working tree chưa commit của 2 proposal trước (timezone, overview-severity) — giữ nguyên

---

## 3. Các bước
### Step 1 — Notes
§9 Approved (ghi theo chỉ thị người dùng); sinh `plan.md`, `status.md`, `testcase/<id>.md`; `notes_index --check`.

### Step 2 — Nhánh
`git switch -c fix/<id>` từ HEAD (git-ship.sh start bị chặn bởi dirty tree), giữ nguyên working tree.

### Step 3 — Code
`filtered.py`: hàm thuần `rounded_forecast(forecast)` (3 chữ số); gọi trong `build_filtered_forecast`. `service.py`: `round(..., 3)` cho 3 field.

### Step 4 — Test & validation
Test unit thuần; `uv run pytest`, ruff check/format, `notes_index.py --check`.

### Step 5 — CHECKPOINT 1
`status.md = validation`, báo cáo, dừng chờ xác nhận.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có. Cùng field, cùng schema; chỉ giá trị làm tròn 1 chữ số.

---

## 5. Validation (nhẹ)
- [x] testcase + file test offline mới
- [x] `cd apps/api && uv run python -m pytest tests/unit/test_prediction_filtered_precision.py tests/unit/test_prediction_service.py` — 22 passed
- [x] `cd apps/api && uv run ruff check . && uv run ruff format --check .` — PASS
- [x] `python3 scripts/notes_index.py --check` — OK
- [x] OCP: không xoá file, không đụng core protected

---

## 6. Rủi ro khi làm
- Test route lọc cũ (nếu có) mong float thô → chưa có; chỉ test hàm thuần.
- FE vẫn padding 3 chữ số → chấp nhận theo yêu cầu trước.

---

## 7. Rollback
Revert commit; không DB/migration. Giữ working tree các proposal trước.

---

## 8. Ghi chú
`rounded_forecast` là hàm thuần, không chạm `classification`.
