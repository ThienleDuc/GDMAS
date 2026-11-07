# [KẾ HOẠCH KIỂM THỬ: TC-ING-01 - NẠP DỮ LIỆU USGS & UPSERT ĐỊNH KỲ]

- **Mã kiểm thử (Test ID):** `TC-ING-01`
- **Tên ca kiểm thử:** Kiểm thử Dịch Vụ Cào Dữ Liệu USGS, Chuẩn Hóa GeoJSON & Cơ Chế Upsert
- **Phân hệ & Terminal:** `T2 - Ingestion Worker` (`python -m gdmas.services.ingestion.runner`)
- **Tầng kiểm thử (Level):** `Unit & Integration Test`
- **Mức độ ưu tiên:** `P0 (Critical - Cung cấp nguồn dữ liệu đầu vào cho toàn bộ hệ thống)`
- **Tệp mã nguồn kiểm thử mục tiêu:** `apps/api/tests/test_ingestion_service.py`
- **Tài liệu tham chiếu:**
  * [docs/planning/features/02-usgs-ingestion.md](../features/02-usgs-ingestion.md)
  * [docs/yeucaubatbuoc.md](../../yeucaubatbuoc.md) (§1. Kiến trúc hệ thống, chu kỳ 5 phút/lần)
  * [docs/quyuocchung.md](../../quyuocchung.md) (Múi giờ UTC, WGS84)

---

## 1. Mục Tiêu Kiểm Thử & Truy Vết Nghiệp Vụ (Test Objectives & Traceability)

### 1.1. Mục tiêu cốt lõi
- Kiểm tra hàm `execute_cycle()` của `IngestionService` khi cào dữ liệu từ USGS GeoJSON API.
- Đảm bảo cơ chế **Upsert (Cập nhật nếu đã có, Thêm mới nếu chưa có)** hoạt động chính xác dựa trên `source_event_id`.
- Kiểm tra tính năng ghi nhận nhật ký vận hành vào bảng `service_runs` sau mỗi chu kỳ (số bản ghi mới nạp, trạng thái `SUCCESS` hoặc `FAILED`).
- Kiểm tra khả năng xử lý lỗi ngoại lệ khi mất mạng hoặc USGS trả về mã lỗi HTTP 5xx (không làm crash tiến trình worker).

### 1.2. Ma trận truy vết yêu cầu (Traceability Matrix)
- [x] **REQ-ING-01:** Thu thập dữ liệu USGS định kỳ theo chu kỳ (5 phút/lần).
- [x] **REQ-ING-02:** Xử lý và trích xuất đúng tọa độ `longitude`, `latitude`, `depth_km` từ mảng `geometry.coordinates`.
- [x] **REQ-ING-03:** Ghi nhận lịch sử chạy vào `service_runs`.

---

## 2. Điều Kiện Tiên Quyết & Dữ Liệu Mẫu (Prerequisites & Fixtures)

### 2.1. Trạng thái hệ thống (Pre-conditions)
- CSDL PostgreSQL đang sẵn sàng kết nối.
- Sử dụng thư viện `unittest.mock` để giả lập phản hồi mạng từ USGS GeoJSON API (tránh phụ thuộc vào mạng ngoài khi chạy automated tests).

### 2.2. Dữ liệu mẫu GeoJSON chuẩn USGS (Mock Fixture)
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "us7000test_ing01",
      "properties": {
        "mag": 5.2,
        "place": "12 km S of Eureka, California",
        "time": 1730889600000,
        "updated": 1730890000000,
        "magType": "mw",
        "url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000test_ing01"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-124.163, 40.802, 18.5]
      }
    }
  ]
}
```

---

## 3. Ma Trận Kịch Bản Kiểm Thử Chi Tiết (Test Scenarios & Assertions)

| ID Kịch Bản | Mô Tả Kịch Bản | Dữ Liệu Đầu Vào | Các Bước Thực Hiện | Kết Quả Mong Đợi (Assertions) |
| :---: | :--- | :--- | :--- | :--- |
| **SC-ING-01** | **Cào và nạp mới sự kiện thành công** | Mock GeoJSON 1 sự kiện mới | 1. Mock `httpx.get` trả về 200 OK<br>2. Chạy `service.execute_cycle()` | • `res["success"] is True`<br>• `res["new_records"] == 1`<br>• Bản ghi xuất hiện trong CSDL |
| **SC-ING-02** | **Cơ chế Upsert (Cập nhật sự kiện cũ)** | Mock GeoJSON với sự kiện đã có trong DB nhưng đổi độ lớn $5.2 \to 5.4$ | 1. Đã có sự kiện trong DB<br>2. Chạy `execute_cycle()` với bản tin cập nhật | • Tổng số bản ghi trong DB không đổi<br>• Trường `magnitude` được cập nhật thành $5.4$ |
| **SC-ING-03** | **Xử lý sự kiện thiếu tọa độ hoặc lỗi định dạng** | GeoJSON có `coordinates: null` | 1. Mock dữ liệu bị lỗi<br>2. Chạy `execute_cycle()` | • Sự kiện lỗi bị bỏ qua (Skip)<br>• Các sự kiện hợp lệ khác vẫn được nạp bình thường |
| **SC-ING-04** | **Xử lý lỗi mạng / Timeout từ USGS** | Mock `httpx.RequestError` | 1. Giả lập rớt mạng khi gọi USGS<br>2. Chạy `execute_cycle()` | • `res["success"] is False`<br>• Bảng `service_runs` ghi trạng thái `FAILED`<br>• Tiến trình không bị văng lỗi crash |

---

## 4. Khung Mã Nguồn Kiểm Thử Mẫu (Executable Pytest Scaffold)

```python
# apps/api/tests/test_ingestion_service.py
import pytest
from unittest.mock import patch, MagicMock
from gdmas.services.ingestion.service import IngestionService
from gdmas.db.connection import SessionLocal
from gdmas.models.earthquake import EarthquakeEvent
from gdmas.models.service_run import ServiceRun

MOCK_GEOJSON = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "id": "us_mock_pytest_01",
            "properties": {
                "mag": 4.8,
                "place": "Southern California",
                "time": 1730889600000,
                "updated": 1730889600000,
                "magType": "ml",
                "url": "https://earthquake.usgs.gov/mock",
            },
            "geometry": {"type": "Point", "coordinates": [-118.243, 34.052, 12.0]},
        }
    ],
}


@patch("gdmas.services.ingestion.service.httpx.get")
def test_ingestion_cycle_success(mock_get):
    """Kiểm tra chu kỳ nạp dữ liệu USGS thành công và ghi nhận service_runs."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = MOCK_GEOJSON
    mock_get.return_value = mock_resp

    service = IngestionService()
    res = service.execute_cycle()

    assert res["success"] is True
    assert res["new_records"] >= 1

    # Kiểm tra bản ghi trong DB
    with SessionLocal() as db:
        event = db.query(EarthquakeEvent).filter_by(source_event_id="us_mock_pytest_01").first()
        assert event is not None
        assert event.magnitude == 4.8
        assert event.latitude == 34.052
        assert event.longitude == -118.243

        # Dọn dẹp
        db.delete(event)
        db.commit()


@patch("gdmas.services.ingestion.service.httpx.get")
def test_ingestion_network_failure_resilience(mock_get):
    """Kiểm tra ứng xử khi mất kết nối mạng: Ghi log lỗi và không crash."""
    mock_get.side_effect = Exception("Connection Timeout to USGS")

    service = IngestionService()
    res = service.execute_cycle()

    assert res["success"] is False
    assert "error" in res
```

---

## 5. Tiêu Chuẩn Nghiệm Thu Đạt / Không Đạt (Pass / Fail Criteria)

- [ ] **Pass:** Tất cả các ca cào dữ liệu, upsert và xử lý mất mạng đều vượt qua.
- [ ] **Coverage:** `gdmas.services.ingestion` đạt độ phủ $\ge 80\%$.
- [ ] **Resilience:** Tuyệt đối không ném ngoại lệ không bắt được (Unhandled Exception) ra ngoài vòng lặp runner.

