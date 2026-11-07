# [KẾ HOẠCH KIỂM THỬ: TC-PAT-05 - DỰ BÁO ĐỊNH LƯỢNG & PHÂN LOẠI RỦI RO t+1]

- **Mã kiểm thử (Test ID):** `TC-PAT-05`
- **Tên ca kiểm thử:** Kiểm thử Mô Hình Hồi Quy Dự Báo Số Lượng Sự Kiện & Mô Hình Phân Loại Rủi Ro Địa Chấn Ngày Kế Tiếp ($t+1$)
- **Phân hệ & Terminal:** `T5 - Prediction Worker` (`python -m gdmas.services.prediction.runner`)
- **Tầng kiểm thử (Level):** `Unit & Integration Test`
- **Mức độ ưu tiên:** `P0 (Critical - Yêu cầu bắt buộc Pattern 5 & 6 của đồ án TS. Phạm Tuấn)`
- **Tệp mã nguồn kiểm thử mục tiêu:** `apps/api/tests/test_prediction.py`
- **Tài liệu tham chiếu:**
  * [docs/planning/features/05-seismic-prediction.md](../features/05-seismic-prediction.md)
  * [docs/yeucaubatbuoc.md](../../yeucaubatbuoc.md) (§2. Pattern 5 & 6, §4. Demo)
  * [docs/api/API.md](../../api/API.md) (§3.3. Endpoints `/api/v1/predictions` & `/api/v1/classifications`)

---

## 1. Mục Tiêu Kiểm Thử & Truy Vết Nghiệp Vụ (Test Objectives & Traceability)

### 1.1. Mục tiêu cốt lõi
- Kiểm tra tính đúng đắn của **Pattern 5 (Dự báo định lượng $t+1$)**:
  * Dự báo số lượng sự kiện địa chấn ngày tiếp theo ($t+1$).
  * Tính toán khoảng tin cậy 95% (`lower_bound`, `upper_bound`) với điều kiện logic: $\text{lower\_bound} \le \text{predicted\_value} \le \text{upper\_bound}$ và $\text{lower\_bound} \ge 0$.
  * Báo cáo các chỉ số sai số đánh giá mô hình: `mae`, `rmse`.
- Kiểm tra tính đúng đắn của **Pattern 6 (Phân loại rủi ro $t+1$)**:
  * Dự đoán nhãn phân loại hoạt động địa chấn: `Low Activity` | `Normal Activity` | `High Activity`.
  * Phân bổ xác suất cho 3 nhãn thỏa mãn tiên đề xác suất Kolmogorov: $P(\text{Low}) + P(\text{Normal}) + P(\text{High}) \approx 1.0$.
  * Báo cáo chỉ số đánh giá `f1_macro` hoặc `accuracy`.
- Đảm bảo kết quả được lưu trữ vào 2 bảng CSDL: `prediction_results` và `classification_results`.
- **Nguyên tắc Demo §4:** Sử dụng mô hình đã build sẵn (Pre-trained / Pre-fit), inference nhanh dưới 1 giây, **không huấn luyện lại mô hình từ đầu trong quá trình test hoặc demo**.

### 1.2. Ma trận truy vết yêu cầu (Traceability Matrix)
- [x] **REQ-PRED-01:** Hiển thị giá trị dự báo định lượng cho ngày tiếp theo ($t+1$) kèm khoảng sai số.
- [x] **REQ-PRED-02:** Hiển thị nhãn phân loại dự đoán cho ngày tiếp theo ($t+1$).
- [x] **REQ-PRED-03:** Lưu kết quả và liên kết `service_run_id`.

---

## 2. Điều Kiện Tiên Quyết & Dữ Liệu Mẫu (Prerequisites & Fixtures)

### 2.1. Trạng thái hệ thống (Pre-conditions)
- CSDL Test sẵn sàng. Cần có dữ liệu chuỗi thời gian quá khứ ít nhất 14 ngày để trích xuất đặc trưng cửa sổ trượt (Lag Features: $t-1, t-2, t-3$).

---

## 3. Ma Trận Kịch Bản Kiểm Thử Chi Tiết (Test Scenarios & Assertions)

| ID Kịch Bản | Mô Tả Kịch Bản | Dữ Liệu Đầu Vào | Các Bước Thực Hiện | Kết Quả Mong Đợi (Assertions) |
| :---: | :--- | :--- | :--- | :--- |
| **SC-PRED-01** | **Dự báo định lượng $t+1$ hợp lệ** | Chuỗi sự kiện 30 ngày | 1. Gọi hàm dự báo $t+1$<br>2. Kiểm tra các trường dữ liệu | • `predicted_value > 0`<br>• `lower_bound <= predicted_value <= upper_bound`<br>• `target_date == today + 1 day` |
| **SC-PRED-02** | **Phân loại rủi ro $t+1$ và tổng xác suất** | Chuỗi sự kiện 30 ngày | 1. Gọi hàm phân loại $t+1$<br>2. Kiểm tra mảng xác suất | • `predicted_label` thuộc `['Low', 'Normal', 'High']`<br>• Tổng xác suất 3 nhãn xấp xỉ $1.0 \pm 0.001$ |
| **SC-PRED-03** | **Lưu trữ CSDL 2 bảng kết quả** | Output mô hình | 1. Ghi vào `prediction_results`<br>2. Ghi vào `classification_results` | • Bản ghi có `id`, `target_date` chuẩn ISO<br>• `model_name` và `model_version` được lưu đúng |
| **SC-PRED-04** | **Khả năng chịu lỗi khi CSDL rỗng (Demo §4)** | Bảng sự kiện rỗng | 1. Xóa sạch DB<br>2. Chạy prediction runner | • Không crash mô hình<br>• Fallback về giá trị an toàn kèm cảnh báo thiếu dữ liệu |

---

## 4. Khung Mã Nguồn Kiểm Thử Mẫu (Executable Pytest Scaffold)

```python
# apps/api/tests/test_prediction.py
import pytest
from datetime import date, timedelta
from gdmas.db.connection import SessionLocal
from gdmas.models.prediction import PredictionResult, ClassificationResult


def test_prediction_quantitative_bounds_and_metrics():
    """Kiểm tra logic dự báo t+1: lower_bound <= predicted <= upper_bound và metrics."""
    from gdmas.services.demo_seeder import compute_prediction_results

    pred = compute_prediction_results()
    assert pred is not None
    assert pred["predicted_value"] > 0
    assert pred["lower_bound"] <= pred["predicted_value"]
    assert pred["predicted_value"] <= pred["upper_bound"]
    assert pred["lower_bound"] >= 0  # Số lượng trận động đất không thể âm


def test_classification_probabilities_sum_to_one():
    """Kiểm tra mô hình phân loại t+1: Tổng xác suất 3 lớp phải bằng 1.0."""
    from gdmas.services.demo_seeder import compute_classification_results

    clf = compute_classification_results()
    assert clf is not None
    assert clf["predicted_label"] in ["Low Activity", "Normal Activity", "High Activity"]

    probs = clf["probability_scores"]
    total_prob = sum(probs.values())
    assert pytest.approx(total_prob, 0.001) == 1.0


def test_prediction_database_persistence():
    """Kiểm tra lưu trữ và truy vấn kết quả dự báo trong PostgreSQL."""
    with SessionLocal() as db:
        tomorrow = date.today() + timedelta(days=1)
        record = PredictionResult(
            target_date=tomorrow,
            metric_name="event_count",
            predicted_value=45.5,
            lower_bound=38.0,
            upper_bound=53.0,
            model_name="RidgeForecaster",
            model_version="1.0.0",
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        assert record.id is not None
        assert record.target_date == tomorrow

        # Dọn dẹp
        db.delete(record)
        db.commit()
```

---

## 5. Tiêu Chuẩn Nghiệm Thu Đạt / Không Đạt (Pass / Fail Criteria)

- [ ] **Pass:** Cả 2 mô hình (hồi quy và phân loại) thỏa mãn logic toán học và xác suất.
- [ ] **Performance:** Thời gian suy luận (Inference time) dưới **500ms**.
- [ ] **Coverage:** `gdmas.services.prediction` đạt độ phủ $\ge 80\%$.

