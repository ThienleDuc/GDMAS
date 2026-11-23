<!-- Template cho .agents/notes/testcase/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này. -->

# Testcase: Chuẩn hóa độ chính xác dự báo (BE, đường lọc)

## Metadata
- ID: 2026-11-24-prediction-filtered-precision-thien
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-24-prediction-filtered-precision-thien.md
- Target: `apps/api/src/gdmas/services/analysis/filtered.py`
- Test File: `apps/api/tests/unit/test_prediction_filtered_precision.py`
- Author: agent | thien
- Created: 2026-11-24
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng:** hàm thuần `rounded_forecast` — chuẩn hóa `predicted`/`lower`/`upper` về **3 chữ số thật**, khớp đường snapshot.
- **Ràng buộc:** I1 (không worker), I3 (không đổi field/schema), I4 (không migration), I7 (offline 100%).

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu
- Không DB/mạng. Fixture dict `{"predicted": 299.542, "lower": 179.705, "upper": 316.753, "other": "keep"}`.

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên | Nhóm | Đầu vào | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Chuẩn 3 field về 3 chữ số | Functional | float many decimals | `299.542`, `179.705`, `316.753` | `PASSED` |
| `TC-02` | Giữ field khác / envelope | Structural | dict có `other` | `other` không đổi, input không mutate | `PASSED` |
| `TC-03` | Giá trị đã 3 chữ số | Boundary | `6.086`, `4.554`, `8.766` | Giữ nguyên | `PASSED` |
| `TC-04` | 2 đường BE cùng chuẩn | Structural | Đọc `filtered.py` + `service.py` | `rounded_forecast(` trong build; snapshot dùng `round(..., 3)` | `PASSED` |

---

## 4. Lệnh thực thi & Kết quả thực tế
```bash
cd apps/api && uv run python -m pytest tests/unit/test_prediction_filtered_precision.py tests/unit/test_prediction_service.py -v
cd apps/api && uv run ruff check . && uv run ruff format --check .
python3 scripts/notes_index.py --check
```
- **Ngày chạy cuối:** `2026-11-24`
- **Kết quả quan sát thật:** `uv run python -m pytest tests/unit/test_prediction_filtered_precision.py tests/unit/test_prediction_service.py -q` → **22 passed**; `ruff check` All checks passed; `ruff format --check` 85 files formatted; `notes_index.py --check` OK. (Lưu ý: binary `pytest` không có trong PATH, dùng `python -m pytest`.)

---

## 5. Lỗi phát hiện & Bug Logs
- `none`
