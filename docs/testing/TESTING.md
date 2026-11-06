# Chiến Lược & Tiêu Chuẩn Kiểm Thử Toàn Diện (Testing Strategy)

Tài liệu này đặc tả toàn bộ chiến lược kiểm thử tự động, cấu trúc phân tầng (Testing Pyramid), cách thiết lập môi trường test, phương pháp giả lập (mocking) dữ liệu địa chấn và bộ công cụ kiểm thử nội bộ (Local Test Suite) thay thế cho CI/CD đám mây trong dự án **GDMAS**.

---

## Mục lục
1. [Triết lý & Kim Tự Tháp Kiểm Thử (Test Pyramid)](#1-triết-lý--kim-tự-tháp-kiểm-thử-test-pyramid)
2. [Bộ Công Cụ Kiểm Thử (Testing Toolchain)](#2-bộ-công-cụ-kiểm-thử-testing-toolchain)
3. [Local Test Suite (`scripts/test.sh`)](#3-local-test-suite-scriptstestsh)
4. [Kiểm Thử Backend & Dịch Vụ Phân Tích](#4-kiểm-thử-backend--dịch-vụ-phân-tích)
   - [Unit Testing](#unit-testing)
   - [Integration Testing với Database Test](#integration-testing-với-database-test)
   - [Kiểm Thử 6 Patterns Chuỗi Thời Gian](#kiểm-thử-6-patterns-chuỗi-thời-gian)
5. [Kiểm Thử Dịch Vụ Nạp Dữ Liệu (Ingestion Resilience Testing)](#5-kiểm-thử-dịch-vụ-nạp-dữ-liệu-ingestion-resilience-testing)
6. [Kiểm Thử Giao Diện Người Dùng (Frontend Testing)](#6-kiểm-thử-giao-diện-người-dùng-frontend-testing)
7. [Tiêu Chuẩn Bao Phủ Mã Nguồn (Code Coverage DoD)](#7-tiêu-chuẩn-bao-phủ-mã-nguồn-code-coverage-dod)
8. [Tài liệu Liên quan](#8-tài-liệu-liên-quan)

---

## 1. Triết lý & Kim Tự Tháp Kiểm Thử (Test Pyramid)

Hệ thống GDMAS xử lý dữ liệu chuỗi thời gian và thực hiện dự báo toán học, do đó chất lượng và độ tin cậy của mã nguồn được đảm bảo qua cấu trúc 3 tầng:

```
               / \
              /   \
             / E2E \       10% - Kiểm thử luồng tích hợp toàn diện (Smoke Test)
            /-------\
           / Integr. \     30% - Kiểm thử Database Queries, API Endpoints & SSE
          /-----------\
         /  Unit Tests \   60% - Kiểm thử thuật toán Toán/ML, Resampling, Parsing
        /---------------\
```

- **Unit Tests (60%):** Kiểm tra tính đúng đắn của logic thuần túy: chuyển đổi tọa độ, chuẩn hóa dữ liệu, tính năng lượng động đất ($E = 10^{4.8 + 1.5M}$), ma trận tương quan, giải thuật STL/Loess và mô hình phân loại. Chạy cực nhanh (< 2 giây), không cần kết nối mạng hay database ngoài.
- **Integration Tests (30%):** Kiểm tra giao tiếp giữa SQLAlchemy Models và PostgreSQL, kiểm tra hợp đồng API RESTful (`fastapi.testclient`), migration scripts và cơ chế Upsert chống trùng lặp.
- **End-to-End & Smoke Tests (10%):** Kiểm tra luồng chạy từ Ingestion nạp dữ liệu -> Analysis tính toán tổng hợp -> Database API phát hành endpoint -> Frontend hiển thị biểu đồ không bị sập.

---

## 2. Bộ Công Cụ Kiểm Thử (Testing Toolchain)

| Tầng kiểm thử | Công cụ | Mục đích |
| :--- | :--- | :--- |
| **Test Runner Backend** | `pytest` | Chạy phát hiện và gom nhóm test case tự động |
| **Async Support** | `pytest-asyncio` | Hỗ trợ kiểm thử các hàm bất đồng bộ của FastAPI và HTTPX |
| **API Client Test** | `httpx.AsyncClient` / `TestClient` | Bắn request giả lập tới FastAPI routes không cần mở port |
| **Đo Độ Phủ (Coverage)** | `pytest-cov` | Báo cáo tỷ lệ dòng lệnh được thực thi bởi tests |
| **Mocking & Fixtures** | `unittest.mock` / `pytest-mock` | Giả lập phản hồi JSON từ USGS GeoJSON API |
| **Frontend Testing** | `vitest` & `@testing-library/react` | Kiểm thử render component và trạng thái hiển thị |

---

## 3. Local Test Suite (`scripts/test.sh`)

Vì dự án **đã loại bỏ GitHub Actions `ci.yml`**, mọi thành viên trong nhóm bắt buộc phải chạy bộ kiểm thử tự động nội bộ trước khi tạo Pull Request hoặc gộp nhánh vào `develop`.

Kịch bản kiểm thử tự động được tích hợp tại `scripts/test.sh`:

```bash
#!/usr/bin/env bash
set -e

echo "========================================================"
echo "    GDMAS LOCAL AUTOMATED TEST SUITE (PRE-COMMIT/PR)    "
echo "========================================================"

# 1. Kiểm tra mã nguồn Backend với Ruff
echo "--> [1/4] Kiểm tra cú pháp và định dạng Python (Ruff)..."
cd apps/api
uv run ruff check .
uv run ruff format --check .

# 2. Chạy Type-Checking Backend với MyPy
echo "--> [2/4] Kiểm tra kiểu dữ liệu tĩnh (MyPy)..."
uv run mypy src --ignore-missing-imports

# 3. Chạy Unit & Integration Tests với Coverage
echo "--> [3/4] Chạy Unit Tests và Integration Tests (Pytest)..."
uv run pytest -v --cov=gdmas --cov-report=term-missing --cov-fail-under=70
cd ../..

# 4. Kiểm tra mã nguồn Frontend
echo "--> [4/4] Kiểm tra TypeScript và Linting Frontend..."
cd apps/web
pnpm type-check
pnpm lint
cd ..

echo "========================================================"
echo "    TẤT CẢ KIỂM THỬ ĐÃ VƯỢT QUA! ĐỦ ĐIỀU KIỆN TẠO PR    "
echo "========================================================"
```

---

## 4. Kiểm Thử Backend & Dịch Vụ Phân Tích

### Unit Testing
Kiểm tra tính toán công thức khoa học độc lập:

```python
# apps/api/tests/unit/test_earthquake_math.py
import pytest
from gdmas.utils.math import calculate_seismic_energy

def test_calculate_seismic_energy():
    # Công thức Gutenberg-Richter: log10(E) = 4.8 + 1.5 * M
    mag = 5.0
    expected_energy = 10 ** (4.8 + 1.5 * mag)
    assert calculate_seismic_energy(mag) == pytest.approx(expected_energy, rel=1e-3)

def test_negative_or_zero_magnitude():
    # Vẫn tính toán hợp lệ cho vi địa chấn (micro-earthquakes)
    assert calculate_seismic_energy(0.0) == pytest.approx(10 ** 4.8, rel=1e-3)
```

### Integration Testing với Database Test
Sử dụng database cô lập hoặc rollback giao dịch tự động (transactional rollback) sau mỗi test:

```python
# apps/api/tests/integration/test_api_earthquakes.py
import pytest
from fastapi.testclient import TestClient
from gdmas.main import app

client = TestClient(app)

def test_health_check_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "database" in data

def test_get_earthquakes_with_filter():
    response = client.get("/api/v1/earthquakes?min_magnitude=4.5&limit=10")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    for event in data:
        assert event["magnitude"] >= 4.5
```

### Kiểm Thử 6 Patterns Chuỗi Thời Gian
Đảm bảo các hàm phân tích luôn trả về dữ liệu đúng khuôn mẫu DTO ngay cả khi tập dữ liệu mẫu ngắn:

```python
# apps/api/tests/unit/test_patterns.py
import pandas as pd
from gdmas.services.analysis.patterns import compute_trend_analysis, compute_correlation_matrix

def test_trend_analysis_structure():
    # Tạo chuỗi thời gian giả lập 30 ngày
    dates = pd.date_range("2026-01-01", periods=30, freq="D")
    df = pd.DataFrame({"magnitude": [4.0 + (i * 0.05) for i in range(30)]}, index=dates)

    result = compute_trend_analysis(df, window=7)
    assert "timestamps" in result
    assert "actual" in result
    assert "trend" in result
    assert len(result["actual"]) == 30
```

---

## 5. Kiểm Thử Dịch Vụ Nạp Dữ Liệu (Ingestion Resilience Testing)

Ingestion Worker phụ thuộc vào USGS API công cộng, do đó cần được kiểm thử khả năng chống chịu lỗi:

- **Giả lập lỗi mạng (Network Timeout / Connection Refused):** Đảm bảo worker không bị crash tắt terminal mà kích hoạt cơ chế `tenacity` retry và ghi log lỗi vào bảng `ingestion_logs`.
- **Kiểm tra tính Idempotent:** Khi nạp cùng một tệp GeoJSON chứa 100 sự kiện 2 lần liên tiếp, tổng số bản ghi trong bảng `earthquakes` không được nhân đôi, bảng dữ liệu phải sử dụng `ON CONFLICT (id) DO UPDATE`.

---

## 6. Kiểm Thử Giao Diện Người Dùng (Frontend Testing)

- **Render Smoke Test:** Đảm bảo tất cả 6 component patterns (`Pattern1Timeseries.tsx` đến `Pattern6Classification.tsx`) có thể hiển thị rỗng (empty state) hoặc skeleton loading khi chưa có dữ liệu từ backend mà không quăng lỗi màn hình trắng (White Screen of Death).
- **Formatters Test:** Kiểm tra hàm format thời gian và định mức màu theo chuẩn Richter.

---

## 7. Tiêu Chuẩn Bao Phủ Mã Nguồn (Code Coverage DoD)

Theo định nghĩa hoàn thành (Definition of Done):
- **Ngưỡng bao phủ tối thiểu:** Mã nguồn Backend (`gdmas/`) phải đạt **tối thiểu 70% Code Coverage**.
- **Không bỏ sót luồng Exception:** Các khối xử lý ngoại lệ mất kết nối DB, API lỗi phải có ít nhất 1 test case giả lập.
- Lệnh `scripts/test.sh` phải trả về mã thoát `0` (Exit code 0) hoàn toàn xanh trước khi yêu cầu Code Review.

---

## 8. Tài liệu Liên quan
- Danh mục Test Cases chi tiết: [test-cases.md](file:///D:/KHDLKPDL/GDMAS/docs/testing/test-cases.md)
- Quy trình làm việc nhóm & DoD: [team-workflow.md](file:///D:/KHDLKPDL/GDMAS/docs/development/team-workflow.md)
- Tiêu chuẩn Coding: [coding-conventions.md](file:///D:/KHDLKPDL/GDMAS/docs/development/coding-conventions.md)
- Sổ tay vận hành hệ thống: [workflow.md](file:///D:/KHDLKPDL/GDMAS/docs/workflow.md)

