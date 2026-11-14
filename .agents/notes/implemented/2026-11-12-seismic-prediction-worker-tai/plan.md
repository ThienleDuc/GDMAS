# Implementation Plan: Động cơ dự báo số trận và phân loại rủi ro ngày kế tiếp (Terminal 5)

## Metadata
- ID: 2026-11-12-seismic-prediction-worker-tai
- Proposal: .agents/notes/proposed/2026-11-12-seismic-prediction-worker-tai.md
- Approved By: tai
- Approved At: 2026-11-14
- Implementer: agent | tai
- Status: completed

---

## 1. Mục tiêu
Xây động cơ dự báo định lượng (Pattern 5) và phân loại rủi ro (Pattern 6) cho ngày kế tiếp, chạy ở Terminal 5 chu kỳ 5 phút, thay thế số liệu giả trong `demo_seeder.py`; cung cấp kết quả thật cho `/api/v1/patterns` và giao diện.

---

## 2. Phạm vi
### In Scope
- `apps/api/src/gdmas/services/prediction/inference.py` *(mới)*
- `apps/api/src/gdmas/services/prediction/service.py` *(mới)*
- `apps/api/src/gdmas/services/prediction/runner.py` *(thay tệp khung)*
- `apps/api/src/gdmas/services/prediction/models/` *(4 tệp: forecast_model.joblib, risk_classifier.joblib, recent_history.json, training_report.json)*
- `scripts/download_usgs_history.py`, `scripts/eda_daily_counts.py`, `scripts/train_models.py` *(mới)*
- `.agents/notes/testcase/2026-11-12-seismic-prediction-worker-tai.md`
- `apps/api/tests/unit/test_prediction_inference.py`, `apps/api/tests/unit/test_prediction_service.py`
### Out of Scope
- `demo_seeder.py`, ORM, migration Alembic, `main.py`, `contracts/`, `apps/web/`.
- Các endpoint REST mới / SSE (Task 2, Task 3 — proposal riêng).

---

## 3. Các bước
### Step 1 — Tải dữ liệu lịch sử USGS
`scripts/download_usgs_history.py`: tải 730 ngày theo đoạn 5 ngày, lưu `data/usgs_history.csv` (281.601 sự kiện). Không commit `data/`.

### Step 2 — EDA và chọn ngưỡng
`scripts/eda_daily_counts.py`: thống kê mô tả, ACF/ADF, baseline MAE; so sánh ngưỡng spec (100/200/350) và ngưỡng phân vị 50/75/90. Chọn ngưỡng phân vị.

### Step 3 — Huấn luyện offline
`scripts/train_models.py`: chia train/test theo thời gian 80/20; thử ARIMA gốc + log, Ridge; baseline hôm qua / MA7 / trung bình train. Pattern 6: so Random Forest, Logistic, Phân phối dự báo; chọn theo accuracy + within-1. Lưu 4 tệp vào `models/`.

### Step 4 — Suy luận
`inference.py`: nạp model, `build_series` (history + DB ghi đè, ngày thiếu NaN), `forecast_next`, `classify_next`, `label_of_count`, `forecast_model_info`, `classifier_model_info`. Ném `NotImplementedError` nếu model khác cặp ARIMA + phân phối dự báo.

### Step 5 — Dịch vụ DB
`service.py`: đọc số trận theo ngày UTC; ghi đè lên `prediction_results` / `classification_results` cùng `target_date`; điền `actual_value` / `actual_label` khi sang ngày UTC mới; ghi `ServiceRun` SUCCESS/FAILED (cắt lỗi ở 1000 ký tự).

### Step 6 — Runner
`runner.py`: vòng lặp `PREDICTION_INTERVAL_SECONDS` (mặc định 300); cờ `--once` cho Demo Bước 4–5; kiểm tra model có đủ ngay khi khởi động, thoát mã 1 nếu thiếu.

### Step 7 — Test offline
Hai tệp test (44 test): cận `0 ≤ lower ≤ predicted ≤ upper`, tổng xác suất = 1, biên nhãn, DB rỗng/lịch sử thưa, ghi đè, điền actual, ServiceRun thành công/thất bại.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có Alembic migration mới (ORM đã đủ cột). Không đổi endpoint. Dùng `PREDICTION_INTERVAL_SECONDS` sẵn có trong `settings`.

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] **Đã tạo đặc tả testcase** tại `.agents/notes/testcase/2026-11-12-seismic-prediction-worker-tai.md`
- [x] **Đã tạo và chạy pass file unit test offline** (`apps/api/tests/unit/test_prediction_inference.py`, `test_prediction_service.py`)
- [x] Backend test liên quan: `cd apps/api && uv run pytest tests/unit -q` → 44 passed
- [x] Backend lint/format: `uv run ruff check src/gdmas/services/prediction` → All checks passed!; `ruff format --check` → 3 files already formatted
- [ ] Frontend typecheck & build: N/A (không đụng `apps/web`)
- [ ] Notes check (`notes_index.py --check`): chạy khi hoàn tất bộ tài liệu
- [x] Tài liệu bị ảnh hưởng: ERD §2.5 và API.md §3 cần cập nhật nếu nhóm chốt 4 nhãn (chưa chốt)
- [x] Kiểm chứng chức năng: runner `--once` in dự báo 212.9 trận [166.7 – 293.9]; `/api/v1/patterns` trả pattern_5 và pattern_6 = COMPUTED
- [x] Chạy lặp 6 chu kỳ không trùng bản ghi; xóa 2 bảng thì runner tái sinh

---

## 6. Rủi ro khi làm
- Nhãn chưa thống nhất với Frontend → giữ `LABELS` một chỗ, dễ đổi.
- Ngày dự báo = hôm nay (UTC) có thể lệch kỳ vọng "ngày mai" → nêu rõ, có phương án 2 bước.
- DB mới ít ngày → dựa vào `recent_history.json`; ghi `history_days_observed`.

---

## 7. Rollback
Revert PR nhánh `feature/feat-05-prediction`. Không có migration nên không cần `alembic downgrade`. Có thể chạy `demo_seeder.py` để tạm khôi phục dữ liệu mẫu nếu cần demo gấp.

---

## 8. Ghi chú
- Không commit `data/`.
- Commit các tệp trong `models/` (nhỏ, nhóm cần để chạy).
- Báo `thien` về tên nhãn và route lấy dự báo (`/patterns` hay `/prediction/latest`).