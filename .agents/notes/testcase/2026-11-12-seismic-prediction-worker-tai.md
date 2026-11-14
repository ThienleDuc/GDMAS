# Testcase: Prediction Worker — Pattern 5 (dự báo số trận t+1) và Pattern 6 (phân loại rủi ro t+1)

## Metadata
- ID: 2026-11-12-seismic-prediction-worker-tai
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-12-seismic-prediction-worker-tai.md
- Target: apps/api/src/gdmas/services/prediction/ (inference.py, service.py, runner.py)
- Test File: apps/api/tests/unit/test_prediction_inference.py, apps/api/tests/unit/test_prediction_service.py
- Author: agent | tai
- Created: 2026-11-12
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng kiểm chứng:** `build_series`, `forecast_next`, `classify_next`, `label_of_count`, `PredictionService._complete_day_counts`, `_predict`, `_fill_actuals`, `execute_cycle`.
- **Ràng buộc GDMAS liên quan:**
  - [x] Tách biệt 7 Terminals (I1 — worker độc lập, không nhúng vào `main.py`).
  - [x] Chuẩn **UTC** (I3).
  - [x] Không fallback về dữ liệu mock tĩnh khi DB rỗng (I5 / Demo §4).
  - [x] Unit test chạy **offline 100%** (session giả, ARIMA nhỏ trên chuỗi giả lập — I7).

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- **Môi trường / Mock:** Fixture tự huấn luyện ARIMA(1,0,0) nhỏ trên chuỗi giả lập (100 ± 10 trận/ngày); `FakeSession` thay cho PostgreSQL; artifact gồm `forecast`, `classifier`, `history`, `report`.
```json
{
  "sample_history": {
    "dates": ["2026-11-01", "2026-11-02", "2026-11-03"],
    "counts": [100, 105, 98]
  },
  "sample_db_counts": {"2026-11-02": 99},
  "thresholds": [90.0, 105.0, 120.0]
}
```

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi (Assertions) | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Build series ghép history và DB ghi đè | Functional | `history` 3 ngày + DB ghi đè 1 ngày | Series đúng thứ tự, DB ghi đè history | `PASS` |
| `TC-02` | Build series nối dài tới `last_day`, ngày thiếu = `NaN` | Boundary | `history` 2 ngày, `last_day` +3, DB có 1 ngày | Độ dài đúng, ngày thiếu `NaN`, ngày DB có giá trị | `PASS` |
| `TC-03` | DB có ngày ngoài phạm vi bị bỏ qua | Boundary | DB có ngày trước và sau khoảng | Chỉ giữ ngày trong khoảng `history` → `last_day` | `PASS` |
| `TC-04` | Forecast: $0 \le \text{lower} \le \text{predicted} \le \text{upper}$ (thang gốc và log) | Functional | Chuỗi 40 ngày | Bất đẳng thức đúng ở cả 2 artifact | `PASS` |
| `TC-05` | Forecast gần mức chuỗi | Functional | Chuỗi ~100 | $60 < \text{predicted} < 140$ | `PASS` |
| `TC-06` | Lower bị cắt ở 0 | Boundary | `q_lo = -1000` | `lower == 0.0`, $\text{predicted} \ge 0$ | `PASS` |
| `TC-07` | Forecast chịu được ngày thiếu (`NaN`) | Resilience | Chuỗi có 3 `NaN` | Bất đẳng thức vẫn đúng | `PASS` |
| `TC-08` | Forecast báo lỗi khi lịch sử quá ngắn | Negative | `< MIN_OBSERVED` ngày | Raise `ValueError` | `PASS` |
| `TC-09` | Forecast báo lỗi khi chuỗi rỗng | Negative | Series rỗng | Raise `ValueError` | `PASS` |
| `TC-10` | Forecast từ chối model type khác | Negative | `type = "ridge"` | Raise `NotImplementedError` | `PASS` |
| `TC-11` | Xác suất phân loại hợp lệ, tổng = 1 (thang gốc và log) | Functional | Chuỗi 40 ngày | Đủ 4 nhãn, mọi $p \ge 0$, tổng $\approx 1$ | `PASS` |
| `TC-12` | Nhãn là mức có xác suất cao nhất | Functional | Chuỗi 40 ngày | `label` có `probabilities[label] = max` | `PASS` |
| `TC-13` | Chuỗi mức cao cho nhãn cao hơn | Functional | AR(0.9), chuỗi $\times 0.3$ vs $\times 1.5$ | `Low` vs cao hơn `Low` | `PASS` |
| `TC-14` | Classifier từ chối type khác | Negative | `type = "sklearn"` | Raise `NotImplementedError` | `PASS` |
| `TC-15` | Biên nhãn `label_of_count` | Boundary | `0, 89.9, 90, 104.9, 105, 119.9, 120, 5000` | Đúng `Low` / `Moderate` / `High` / `Critical` | `PASS` |
| `TC-16` | `forecast_model_info` dùng baseline tốt nhất | Functional | `report` có nhiều baseline | `baseline_mae = min`, đúng `mae`/`rmse`/`coverage` | `PASS` |
| `TC-17` | `classifier_model_info` tên đọc được + metrics | Functional | `report` | Tên `"Forecast-Distribution Risk Classifier"`, classes/thresholds đúng | `PASS` |
| `TC-18` | Thiếu file model báo lỗi rõ ràng | Negative | `MODEL_DIR` rỗng | `FileNotFoundError` nhắc `train_models.py` | `PASS` |
| `TC-19` | `_complete_day_counts` DB rỗng | Resilience | `first_ts = None` | `{}` | `PASS` |
| `TC-20` | `_complete_day_counts` sự kiện đầu hôm nay/hôm qua | Boundary | `first_ts` hôm nay / 23h hôm qua | `{}` | `PASS` |
| `TC-21` | `_complete_day_counts` map rows → date | Functional | 2 rows | Dict đúng | `PASS` |
| `TC-22` | `_fill_actuals` điền value + label | Functional | DB có ngày đó | `actual_value = 130`, `actual_label = Critical` | `PASS` |
| `TC-23` | `_fill_actuals` giữ `None` khi DB thiếu ngày | Resilience | DB thiếu ngày | `actual_value` / `actual_label = None` | `PASS` |
| `TC-24` | `_fill_actuals` DB rỗng không làm gì | Resilience | `{}` | Giữ `None` | `PASS` |
| `TC-25` | `_predict` ghi prediction + classification hợp lệ | Functional | DB rỗng | Bất đẳng thức, tổng xác suất = 1, đúng version, commit 1 lần | `PASS` |
| `TC-26` | `_predict` ghi đè bản ghi cùng ngày | Functional | Gọi 2 lần | `PredictionResult` / `ClassificationResult` bị delete trước khi add | `PASS` |
| `TC-27` | `_predict` ưu tiên DB hơn history | Functional | DB có 10 ngày $\times 300$ | $\text{predicted} \approx 270$, cao hơn baseline $> 100$ | `PASS` |
| `TC-28` | `_predict` cắt tên model dài 64 ký tự | Boundary | `model name` 200 ký tự | `len(model_name) == 64` | `PASS` |
| `TC-29` | `_predict` lỗi sạch khi lịch sử quá ngắn | Negative | `history` 1 ngày | Raise `ValueError`, không ghi bản ghi | `PASS` |
| `TC-30` | `execute_cycle` ghi `ServiceRun` `SUCCESS` | Functional | DB rỗng | `status SUCCESS`, `records 2`, `finished_at` có | `PASS` |
| `TC-31` | `execute_cycle` ghi `FAILED` không ném lỗi | Resilience | `history` quá ngắn | `success False`, `status FAILED`, rollback 1 | `PASS` |
| `TC-32` | `execute_cycle` cắt `error_message` 1000 ký tự | Boundary | Lỗi 5000 ký tự | `len(error_message) == 1000` | `PASS` |
| `TC-33` | `execute_cycle` báo lỗi khi thiếu model | Negative | `MODEL_DIR` rỗng | `status FAILED` | `PASS` |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/api && uv run pytest tests/unit/test_prediction_inference.py tests/unit/test_prediction_service.py -v
cd apps/api && uv run ruff check tests/unit
cd apps/api && uv run ruff format --check tests/unit
```

- **Ngày chạy cuối:** `2026-11-14`
- **Kết quả quan sát thật:** `44 passed (28 inference + 16 service); ruff check All checks passed!; ruff format --check 3 files already formatted.`
- **Hạn chế:** Các test dùng session giả, nên câu SQL riêng của PostgreSQL (`func.timezone`, nhóm theo ngày) chưa được chạy thật; đã kiểm chứng thủ công trên DB thật qua runner.

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- `none` *(nếu phát hiện lỗi khi chạy unit test, tạo `BUG-<handle>-NNN-<slug>.md` trong `.agents/notes/bugs/` và liệt kê ID + tóm tắt tại đây).*