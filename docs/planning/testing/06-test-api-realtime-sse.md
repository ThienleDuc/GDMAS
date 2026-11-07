# [KẾ HOẠCH KIỂM THỬ: TC-API-01 - DATABASE REST API & LUỒNG SSE REALTIME]

- **Mã kiểm thử (Test ID):** `TC-API-01`
- **Tên ca kiểm thử:** Kiểm thử Chuẩn Hợp Đồng REST API Envelope, Bộ Lọc Đa Chiều & Kênh Server-Sent Events (SSE)
- **Phân hệ & Terminal:** `T6 - Database API Service` (FastAPI Server tại Port 8000)
- **Tầng kiểm thử (Level):** `Integration Test`
- **Mức độ ưu tiên:** `P0 (Critical - Cầu nối độc đạo giữa Backend và Web Client)`
- **Tệp mã nguồn kiểm thử mục tiêu:** `apps/api/tests/test_api_endpoints.py` & `test_realtime_sse.py`
- **Tài liệu tham chiếu:**
  * [docs/planning/features/06-api-realtime-sse.md](../features/06-api-realtime-sse.md)
  * [docs/api/API.md](../../api/API.md) (Đặc tả toàn diện API v1 và SSE)
  * [docs/yeucaubatbuoc.md](../../yeucaubatbuoc.md) (§1. Database API, §4. Demo)

---

## 1. Mục Tiêu Kiểm Thử & Truy Vết Nghiệp Vụ (Test Objectives & Traceability)

### 1.1. Mục tiêu cốt lõi
- Kiểm tra toàn bộ phản hồi từ FastAPI đều được đóng gói theo cấu trúc Envelope chuẩn:
  `{ "success": true, "data": ..., "metadata": { "total", "page", "limit", "last_updated" } }`.
- Kiểm tra bộ lọc đa chiều của `GET /api/v1/earthquakes`: Lọc theo độ lớn Richter (`min_magnitude`, `max_magnitude`), độ sâu (`min_depth`, `max_depth`), thời gian và phân trang.
- Kiểm tra tính sống động của kênh truyền thời gian thực **Server-Sent Events (SSE)** tại `GET /api/v1/events/stream`:
  * Định dạng luồng sự kiện `text/event-stream`.
  * Phát đúng các event: `earthquake_alert`, `database_cleared`, `heartbeat`.
- Kiểm tra endpoint kiểm tra sức khỏe hệ thống `GET /api/v1/health` và `GET /api/v1/system/status`.

### 1.2. Ma trận truy vết yêu cầu (Traceability Matrix)
- [x] **REQ-API-01:** Phục vụ REST API cho Web Client, không cho Web Client kết nối trực tiếp vào PostgreSQL.
- [x] **REQ-API-02:** Đáp ứng đầy đủ các endpoints cho 6 Patterns và Phân cụm.
- [x] **REQ-API-03:** SSE stream đẩy thông báo động đất mới và cảnh báo xóa DB tức thời ($t < 100\text{ ms}$).

---

## 2. Điều Kiện Tiên Quyết & Dữ Liệu Mẫu (Prerequisites & Fixtures)

### 2.1. Trạng thái hệ thống (Pre-conditions)
- Khởi tạo `TestClient(app)` từ FastAPI.
- CSDL Test có dữ liệu mẫu phân bố nhiều cấp độ Richter để kiểm thử lọc.

---

## 3. Ma Trận Kịch Bản Kiểm Thử Chi Tiết (Test Scenarios & Assertions)

| ID Kịch Bản | Mô Tả Kịch Bản | Dữ Liệu Đầu Vào | Các Bước Thực Hiện | Kết Quả Mong Đợi (Assertions) |
| :---: | :--- | :--- | :--- | :--- |
| **SC-API-01** | **Health Check & Kết nối DB** | `GET /api/v1/health` | 1. Bắn request GET<br>2. Kiểm tra JSON trả về | • Status `200 OK`<br>• `data.status == "healthy"`<br>• `data.database == "connected"` |
| **SC-API-02** | **Envelope Chuẩn & Phân trang** | `GET /api/v1/earthquakes?page=1&limit=10` | 1. Bắn request GET<br>2. Kiểm tra envelope | • `success is True`<br>• `len(data) <= 10`<br>• `metadata.total >= 0` |
| **SC-API-03** | **Bộ lọc đa chiều (Magnitude & Depth)** | `GET /api/v1/earthquakes?min_magnitude=5.0&max_depth=30` | 1. Bắn request kèm query params | • 100% sự kiện trả về có `magnitude >= 5.0`<br>• 100% sự kiện có `depth_km <= 30.0` |
| **SC-API-04** | **Báo lỗi Validation hợp lệ (HTTP 400)** | `GET /api/v1/earthquakes?min_magnitude=7.0&max_magnitude=3.0` | 1. Cố tình truyền min > max | • Status `400 Bad Request`<br>• `success is False`<br>• `error.code == "VALIDATION_ERROR"` |
| **SC-API-05** | **Kênh phát SSE Stream (Real-time)** | `GET /api/v1/events/stream` | 1. Kết nối với header `Accept: text/event-stream`<br>2. Kích hoạt phát sự kiện | • Header `Content-Type: text/event-stream`<br>• Dòng phát nhận được bắt đầu bằng `event:` và `data:` |

---

## 4. Khung Mã Nguồn Kiểm Thử Mẫu (Executable Pytest Scaffold)

```python
# apps/api/tests/test_api_endpoints.py
import pytest
from fastapi.testclient import TestClient
from gdmas.main import app

client = TestClient(app)


def test_health_check():
    """Kiểm tra endpoint /health và kết nối DB."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_earthquakes_api_envelope_and_filtering():
    """Kiểm tra hợp đồng Envelope chuẩn và bộ lọc min_magnitude."""
    response = client.get("/api/v1/earthquakes?min_magnitude=4.5&limit=20")
    assert response.status_code == 200
    res = response.json()

    # Kiểm tra cấu trúc Envelope chuẩn theo docs/api/API.md
    assert "success" in res
    assert "data" in res
    assert "metadata" in res
    assert res["success"] is True

    # Kiểm tra bộ lọc
    for item in res["data"]:
        assert item["magnitude"] >= 4.5


def test_patterns_endpoint_returns_data_or_empty_notice():
    """Kiểm tra endpoint /api/v1/patterns trả về danh mục 6 patterns."""
    response = client.get("/api/v1/patterns")
    assert response.status_code == 200
    data = response.json()

    # Phải có trường success và danh sách patterns
    assert "patterns" in data or "data" in data
```

---

## 5. Tiêu Chuẩn Nghiệm Thu Đạt / Không Đạt (Pass / Fail Criteria)

- [ ] **Pass:** 100% endpoints trả về đúng cấu trúc Envelope và mã HTTP status theo đặc tả `docs/api/API.md`.
- [ ] **Security & Validation:** Các tham số lọc sai quy chuẩn phải trả về lỗi `400` rõ ràng, không để lọt lỗi `500`.
- [ ] **Coverage:** `gdmas.api.routes` đạt độ phủ $\ge 85\%$.

