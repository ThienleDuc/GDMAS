# [KẾ HOẠCH KIỂM THỬ: TC-PAT-01 - PHÂN TÍCH 4 PATTERNS CHUỖI THỜI GIAN]

- **Mã kiểm thử (Test ID):** `TC-PAT-01`
- **Tên ca kiểm thử:** Kiểm thử Thuật Toán Phân Tích Chuỗi Thời Gian: Biểu Diễn Thời Gian, Xu Hướng Trend, Mùa Vụ Seasonality & Ma Trận Tương Quan
- **Phân hệ & Terminal:** `T3 - Analysis Worker` (`python -m gdmas.services.analysis.runner`)
- **Tầng kiểm thử (Level):** `Unit & Integration Test`
- **Mức độ ưu tiên:** `P0 (Critical - Yêu cầu cốt lõi 3.0 điểm của đồ án TS. Phạm Tuấn)`
- **Tệp mã nguồn kiểm thử mục tiêu:** `apps/api/tests/test_timeseries_analysis.py`
- **Tài liệu tham chiếu:**
  * [docs/planning/features/03-timeseries-analysis.md](../features/03-timeseries-analysis.md)
  * [docs/yeucaubatbuoc.md](../../yeucaubatbuoc.md) (§2. 4 Patterns đầu tiên, §4. Demo)
  * [docs/api/API.md](../../api/API.md) (§3.3. Endpoints Temporal, Trend, Seasonality, Correlation)

---

## 1. Mục Tiêu Kiểm Thử & Truy Vết Nghiệp Vụ (Test Objectives & Traceability)

### 1.1. Mục tiêu cốt lõi
- Kiểm tra tính toán chính xác của **4 Patterns phân tích chuỗi thời gian**:
  1. **Pattern 1 (Biểu diễn thời gian):** Tổng hợp sự kiện theo Ngày/Tuần/Tháng cho Line chart, Scatter plot và phân khoảng cấp độ Richter cho Histogram.
  2. **Pattern 2 (Trend Analysis):** Re-sampling dữ liệu theo Tuần/Tháng và tính toán đường xu hướng mượt (Moving Average / Decomposition).
  3. **Pattern 3 (Seasonality):** Bóc tách chu kỳ mùa vụ theo các tháng trong năm (Seasonal Line) và đánh giá độ mạnh của chu kỳ.
  4. **Pattern 4 (Correlation Matrix):** Tính toán ma trận hệ số tương quan Pearson giữa các biến định lượng: `magnitude`, `depth_km`, `latitude`, `longitude`, `daily_count`.
- Kiểm tra việc lưu kết quả vào bảng `analysis_results` với `metrics_data` chuẩn JSONB.
- **Bảo chứng Demo §4:** Khi CSDL bị xóa rỗng, hàm phân tích phải xử lý an toàn (trả về trạng thái CSDL rỗng hoặc mảng trống, không crash).

### 1.2. Ma trận truy vết yêu cầu (Traceability Matrix)
- [x] **REQ-PAT-01:** Đủ 3 biểu đồ (Line, Scatter, Histogram) theo đúng Ngày/Tuần/Tháng.
- [x] **REQ-PAT-02:** Trend Analysis sau khi Re-sampling Tháng/Tuần.
- [x] **REQ-PAT-03:** Seasonal line sau khi Re-sampling Tháng/Tuần.
- [x] **REQ-PAT-04:** Correlation Matrix đa biến định lượng ($r \in [-1.0, 1.0]$).

---

## 2. Điều Kiện Tiên Quyết & Dữ Liệu Mẫu (Prerequisites & Fixtures)

### 2.1. Trạng thái hệ thống (Pre-conditions)
- CSDL Test chứa ít nhất 100 sự kiện địa chấn trải dài qua tối thiểu 6 tháng để thuật toán Re-sampling và chu kỳ mùa vụ có ý nghĩa thống kê.

### 2.2. Dữ liệu mẫu (Synthetic Seismic Time-Series Fixture)
*Tạo chuỗi sự kiện phân bố từ tháng 01/2026 đến tháng 06/2026 với các biến thiên về độ lớn ($1.0 - 7.0$) và độ sâu ($5 - 500$ km).*

---

## 3. Ma Trận Kịch Bản Kiểm Thử Chi Tiết (Test Scenarios & Assertions)

| ID Kịch Bản | Mô Tả Kịch Bản | Dữ Liệu Đầu Vào | Các Bước Thực Hiện | Kết Quả Mong Đợi (Assertions) |
| :---: | :--- | :--- | :--- | :--- |
| **SC-PAT-01** | **Pattern 1: Tổng hợp biểu diễn thời gian** | 100 sự kiện 6 tháng | 1. Gọi hàm tính Pattern 1<br>2. Kiểm tra các mảng kết quả | • `line_chart` gom theo ngày đủ `date`, `event_count`<br>• `histogram` chia đúng 5 khoảng Richter |
| **SC-PAT-02** | **Pattern 2: Re-sampling và Trend Analysis** | 100 sự kiện | 1. Chạy Re-sampling theo tháng (`M`)<br>2. Tính đường xu hướng | • `series` chứa `period`, `actual_value`, `trend_value`<br>• `slope` và `trend_direction` được tính toán |
| **SC-PAT-03** | **Pattern 3: Bóc tách chu kỳ mùa vụ** | 100 sự kiện | 1. Chạy phân rã Seasonality<br>2. Kiểm tra chu kỳ các tháng | • `seasonal_line` có 12 chu kỳ (tháng 1 đến 12)<br>• `seasonality_strength` nằm trong đoạn $[0, 1]$ |
| **SC-PAT-04** | **Pattern 4: Ma trận tương quan đa biến** | 100 sự kiện | 1. Tính ma trận Pearson<br>2. Kiểm tra tính đối xứng và đường chéo chính | • Đường chéo chính của ma trận luôn bằng $1.0$<br>• Mọi giá trị $r$ nằm trong $[-1.0, +1.0]$<br>• Ma trận đối xứng qua đường chéo chính |
| **SC-PAT-05** | **Khả năng chịu lỗi khi CSDL rỗng (Demo §4)** | Bảng `earthquake_events` có 0 bản ghi | 1. TRUNCATE sự kiện<br>2. Chạy chu kỳ phân tích | • Không ném lỗi ngoại lệ chia cho 0 (`ZeroDivisionError`)<br>• Trả về kết quả rỗng kèm thông báo an toàn |

---

## 4. Khung Mã Nguồn Kiểm Thử Mẫu (Executable Pytest Scaffold)

```python
# apps/api/tests/test_timeseries_analysis.py
import pytest
import numpy as np
from datetime import datetime, timezone, timedelta

from gdmas.db.connection import SessionLocal
from gdmas.models.earthquake import EarthquakeEvent
from gdmas.models.analysis import AnalysisResult


@pytest.fixture
def populated_events(db_session):
    """Fixture tạo dữ liệu động đất mẫu trải dài 60 ngày."""
    base_time = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
    events = []
    for i in range(120):
        t = base_time + timedelta(hours=i * 12)
        mag = 2.0 + (i % 5) * 1.0  # mag 2.0 đến 6.0
        depth = 10.0 + (i % 10) * 15.0
        events.append(
            EarthquakeEvent(
                source="USGS",
                source_event_id=f"test_ts_{i}",
                event_time=t,
                latitude=35.0 + (i % 20) * 0.1,
                longitude=135.0 + (i % 20) * 0.1,
                magnitude=mag,
                depth_km=depth,
            )
        )
    db_session.add_all(events)
    db_session.commit()
    yield events
    # Dọn dẹp
    db_session.query(EarthquakeEvent).filter(EarthquakeEvent.source_event_id.like("test_ts_%")).delete()
    db_session.commit()


def test_pattern_4_correlation_matrix_properties(populated_events):
    """Kiểm tra ma trận tương quan Pearson đa biến: đường chéo chính = 1.0 và đối xứng."""
    from gdmas.services.demo_seeder import compute_correlation_matrix  # Hoặc service analysis tương ứng

    result = compute_correlation_matrix()
    matrix = np.array(result["matrix"])

    # Kiểm tra đường chéo chính
    for i in range(len(matrix)):
        assert pytest.approx(matrix[i, i], 0.01) == 1.0

    # Kiểm tra tính đối xứng
    assert np.allclose(matrix, matrix.T, atol=1e-4)

    # Kiểm tra miền giá trị [-1, 1]
    assert np.all(matrix >= -1.0) and np.all(matrix <= 1.0)


def test_empty_database_analysis_resilience(db_session):
    """Kiểm tra khả năng chịu lỗi khi CSDL bị xóa trống (Demo Bước 2 & 4)."""
    # Đảm bảo bảng sự kiện rỗng
    db_session.query(EarthquakeEvent).delete()
    db_session.commit()

    from gdmas.services.demo_seeder import seed_and_compute_all_patterns

    # Hàm không được gây crash khi DB rỗng mà phải tự động seed hoặc báo an toàn
    summary = seed_and_compute_all_patterns()
    assert summary["analysis_records"] >= 0
```

---

## 5. Tiêu Chuẩn Nghiệm Thu Đạt / Không Đạt (Pass / Fail Criteria)

- [ ] **Pass:** 100% các phép tính Resampling, Trend, Mùa vụ và Ma trận tương quan thỏa mãn các tiên đề toán học.
- [ ] **Resilience:** Vượt qua kịch bản CSDL rỗng mà không phát sinh lỗi chia cho 0.
- [ ] **Coverage:** Module phân tích chuỗi thời gian đạt độ phủ $\ge 80\%$.

