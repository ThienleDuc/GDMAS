# [KẾ HOẠCH KIỂM THỬ: TC-DB-01 - CƠ SỞ DỮ LIỆU & LƯU TRỮ POSTGRESQL]

- **Mã kiểm thử (Test ID):** `TC-DB-01`
- **Tên ca kiểm thử:** Kiểm thử Mô hình CSDL PostgreSQL 16, Migrations Alembic & Cơ Chế Ràng Buộc Dữ Liệu
- **Phân hệ & Terminal:** `T1 - Database Server` (PostgreSQL 16 Alpine qua Docker)
- **Tầng kiểm thử (Level):** `Integration Test`
- **Mức độ ưu tiên:** `P0 (Critical - Bắt buộc cho toàn bộ pipeline dữ liệu)`
- **Tệp mã nguồn kiểm thử mục tiêu:** `apps/api/tests/test_db_models.py`
- **Tài liệu tham chiếu:**
  * [docs/planning/features/01-database-storage.md](../features/01-database-storage.md)
  * [docs/architecture/ERD.md](../../architecture/ERD.md)
  * [docs/yeucaubatbuoc.md](../../yeucaubatbuoc.md) (§1. Kiến trúc hệ thống)

---

## 1. Mục Tiêu Kiểm Thử & Truy Vết Nghiệp Vụ (Test Objectives & Traceability)

### 1.1. Mục tiêu cốt lõi
- Kiểm tra tính toàn vẹn của 6 bảng CSDL cốt lõi: `earthquake_events`, `analysis_results`, `clustering_results`, `clustering_event_mapping`, `prediction_results`, `classification_results`, `service_runs`.
- Đảm bảo cơ chế khóa duy nhất `source_event_id` (Unique Constraint) ngăn chặn triệt để bản ghi trùng lặp khi nạp từ USGS.
- Kiểm tra múi giờ lưu trữ luôn là **UTC (`TIMESTAMPTZ`)** và tọa độ lưu dạng số thực độ chính xác kép **`double precision`** theo chuẩn WGS84.

### 1.2. Ma trận truy vết yêu cầu (Traceability Matrix)
- [x] **REQ-DB-01:** Bảng `earthquake_events` lưu đúng kiểu dữ liệu WGS84, `magnitude` float, `depth_km` float.
- [x] **REQ-DB-02:** Khóa ngoại `service_run_id` liên kết chính xác từ các bảng kết quả sang bảng `service_runs`.
- [x] **REQ-DB-03:** Hỗ trợ kịch bản xóa bảng phục vụ Demo §4 (`TRUNCATE` không bị kẹt deadlock).

---

## 2. Điều Kiện Tiên Quyết & Dữ Liệu Mẫu (Prerequisites & Fixtures)

### 2.1. Trạng thái hệ thống (Pre-conditions)
- Container PostgreSQL đang chạy tại cổng 5432 (`docker compose up -d postgres`).
- Đã chạy migration mới nhất qua Alembic (`uv run alembic upgrade head`).

### 2.2. Dữ liệu mẫu (Test Fixture)
```python
SAMPLE_EVENT = {
    "source": "USGS",
    "source_event_id": "us7000test_db01",
    "event_time": "2026-11-06T10:45:22Z",
    "latitude": 38.291,
    "longitude": 142.381,
    "depth_km": 24.5,
    "magnitude": 5.8,
    "magnitude_type": "mww",
    "place": "Near East Coast of Honshu, Japan",
    "source_url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000test_db01",
    "raw_data": {"type": "Feature", "properties": {"mag": 5.8}},
}
```

---

## 3. Ma Trận Kịch Bản Kiểm Thử Chi Tiết (Test Scenarios & Assertions)

| ID Kịch Bản | Mô Tả Kịch Bản | Dữ Liệu Đầu Vào | Các Bước Thực Hiện | Kết Quả Mong Đợi (Assertions) |
| :---: | :--- | :--- | :--- | :--- |
| **SC-DB-01** | **Tạo mới sự kiện địa chấn hợp lệ** | `SAMPLE_EVENT` | 1. Tạo đối tượng `EarthquakeEvent`<br>2. Lưu vào DB và commit | • Bản ghi có `id` tăng tự động<br>• `event_time` lưu đúng UTC timezone-aware |
| **SC-DB-02** | **Chống trùng lặp khóa `source_event_id`** | Chèn 2 lần cùng `source_event_id` | 1. Chèn bản ghi 1<br>2. Cố tình chèn tiếp bản ghi 2 với cùng mã | • Ném lỗi `IntegrityError` từ SQLAlchemy / PostgreSQL<br>• Transaction được rollback an toàn |
| **SC-DB-03** | **Kiểm tra liên kết khóa ngoại `service_runs`** | Tạo 1 `ServiceRun` và 1 `AnalysisResult` | 1. Insert `ServiceRun`<br>2. Insert `AnalysisResult` trỏ `service_run_id` | • Truy vấn `analysis.service_run` trả về đúng đối tượng cha |
| **SC-DB-04** | **Kiểm tra kịch bản TRUNCATE dữ liệu (Demo §4)** | Bảng có 100 bản ghi | 1. Chạy lệnh `TRUNCATE analysis_results`<br>2. Đếm số bản ghi trong bảng | • Bảng trở về đúng 0 bản ghi<br>• Không làm ảnh hưởng tới bảng `earthquake_events` |

---

## 4. Khung Mã Nguồn Kiểm Thử Mẫu (Executable Pytest Scaffold)

```python
# apps/api/tests/test_db_models.py
import pytest
from datetime import datetime, timezone
from sqlalchemy.exc import IntegrityError

from gdmas.db.connection import SessionLocal
from gdmas.models.earthquake import EarthquakeEvent
from gdmas.models.service_run import ServiceRun
from gdmas.models.analysis import AnalysisResult


def test_insert_earthquake_event():
    """Kiểm tra chèn sự kiện địa chấn mới và tính timezone-aware UTC."""
    with SessionLocal() as db:
        event = EarthquakeEvent(
            source="USGS",
            source_event_id="test_sc_db_01",
            event_time=datetime(2026, 11, 6, 10, 45, 22, tzinfo=timezone.utc),
            latitude=38.291,
            longitude=142.381,
            depth_km=24.5,
            magnitude=5.8,
            magnitude_type="mww",
            place="Off Coast Honshu, Japan",
        )
        db.add(event)
        db.commit()
        db.refresh(event)

        assert event.id is not None
        assert event.event_time.tzinfo is not None
        assert event.latitude == 38.291

        # Dọn dẹp
        db.delete(event)
        db.commit()


def test_duplicate_source_event_id_fails():
    """Kiểm tra ràng buộc duy nhất trên source_event_id."""
    with SessionLocal() as db:
        e1 = EarthquakeEvent(
            source="USGS",
            source_event_id="test_dup_01",
            event_time=datetime.now(timezone.utc),
            latitude=10.0,
            longitude=10.0,
            depth_km=10.0,
            magnitude=4.0,
        )
        e2 = EarthquakeEvent(
            source="USGS",
            source_event_id="test_dup_01",
            event_time=datetime.now(timezone.utc),
            latitude=12.0,
            longitude=12.0,
            depth_km=15.0,
            magnitude=4.2,
        )
        db.add(e1)
        db.commit()

        db.add(e2)
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()

        # Dọn dẹp e1
        db.delete(e1)
        db.commit()
```

---

## 5. Tiêu Chuẩn Nghiệm Thu Đạt / Không Đạt (Pass / Fail Criteria)

- [ ] **Pass:** 100% test cases chèn, ràng buộc khóa duy nhất và quan hệ khóa ngoại vượt qua (`passed`).
- [ ] **Coverage:** Module `gdmas.models` và `gdmas.db` đạt độ phủ mã nguồn $\ge 85\%$.
- [ ] **Cleanliness:** Dữ liệu thử nghiệm được dọn dẹp sạch sẽ sau mỗi test case.

