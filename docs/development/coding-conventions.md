# QUY CHUẨN LẬP TRÌNH VÀ TIÊU CHUẨN MÃ NGUỒN (CODING CONVENTIONS)

# HỆ THỐNG GIÁM SÁT VÀ PHÂN TÍCH THIÊN TAI TOÀN CẦU (GDMAS)

- **Phạm vi:** Toàn bộ mã nguồn Backend (`apps/api`), Frontend (`apps/web`), Cơ sở dữ liệu và Script
- **Nguyên tắc cốt lõi:** **Không sửa mã nguồn hiện có – Chỉ bổ sung thêm mới (Open-Closed Principle)**

---

## Mục lục
1. [Nguyên tắc Vàng: Open-Closed Principle](#1-nguyên-tắc-vàng-open-closed-principle)
2. [Quy chuẩn Python Backend (`apps/api`)](#2-quy-chuẩn-python-backend-appsapi)
3. [Quy chuẩn Frontend React & TypeScript (`apps/web`)](#3-quy-chuẩn-frontend-react--typescript-appsweb)
4. [Quy chuẩn Cơ sở dữ liệu PostgreSQL & Alembic](#4-quy-chuẩn-cơ-sở-dữ-liệu-postgresql--alembic)
5. [Quy chuẩn Commit Message (Conventional Commits)](#5-quy-chuẩn-commit-message-conventional-commits)

---

## 1. Nguyên tắc Vàng: Open-Closed Principle

Dự án áp dụng nguyên tắc thiết kế phần mềm cốt lõi: **Đóng với việc sửa đổi mã nguồn đã chạy ổn định, Mở với việc mở rộng / bổ sung mã nguồn mới**:

### 1.1. Đóng với việc sửa đổi (Closed for Modification)
- **Tôn trọng các tệp mã nguồn hiện hữu:** Không tự ý sửa đổi logic bên trong các tệp, lớp, hàm đang hoạt động ổn định trong `apps/api/src/gdmas/` và `apps/web/src/`.
- **Bảo toàn giao diện hàm (Function Signature):** Không thay đổi tên hàm, tham số hoặc kiểu dữ liệu trả về của các hàm đã được module khác gọi.
- **Không xóa hoặc đổi tên file:** Giữ nguyên cấu trúc định danh file để tránh gây ra lỗi import hoặc phá vỡ các bài kiểm thử tự động.

### 1.2. Mở với việc mở rộng (Open for Extension)
Mọi tính năng mới, giải thuật phân tích chuỗi thời gian hoặc thành phần giao diện mới phải được xây dựng theo hình thức **bổ sung thêm mới**:
- **Bổ sung Service Runners độc lập:** Mỗi service (`ingestion`, `analysis`, `clustering`, `prediction`) bổ sung file runner riêng (ví dụ `runner.py`) để chạy độc lập tại 1 terminal mà không cần sửa đổi `main.py`.
- **Bổ sung API Routers & Schemas:** Bổ sung file route mới trong `api/routes/` và đăng ký vào router chính; bổ sung schema mới trong `schemas/`.
- **Bổ sung Frontend Components & Charts:** Bổ sung các UI component mới trong `components/charts/` cho 6 nhóm biểu đồ mà không ghi đè component sẵn có.
- **Bổ sung Test Cases:** Bổ sung các bài test trong `tests/unit/` và `tests/integration/`.

---

## 2. Quy chuẩn Python Backend (`apps/api`)

### 2.1. Phiên bản & Công cụ chuẩn hóa
- **Môi trường:** Python $\ge 3.11$ (được quản lý thông qua trình quản lý gói `uv`).
- **Linter & Formatter:** Bắt buộc sử dụng **Ruff** để kiểm tra và định dạng mã nguồn:
  ```bash
  # Kiểm tra lỗi quy chuẩn
  uv run ruff check .

  # Tự động sửa lỗi format chuẩn PEP 8
  uv run ruff format .
  ```

### 2.2. Kiểm soát Kiểu dữ liệu (Type Hints)
Bắt buộc khai báo Type Hints đầy đủ cho toàn bộ tham số đầu vào và giá trị trả về của hàm:

```python
# CHUẨN:
def calculate_trend_series(
    events: list[EarthquakeEvent], 
    resample_freq: str = "M"
) -> dict[str, list[float]]:
    ...

# KHÔNG CHẤP NHẬN:
def calculate_trend_series(events, resample_freq="M"):
    ...
```

### 2.3. Quy ước Đặt tên (Naming Conventions)
| Thành phần | Quy ước | Ví dụ |
| :--- | :--- | :--- |
| **Tệp tin (Files/Modules)** | `snake_case.py` | `earthquake_service.py`, `correlation_analyzer.py` |
| **Gói (Packages)** | `snake_case` | `gdmas.services.analysis` |
| **Lớp (Classes / Models)** | `PascalCase` | `EarthquakeProcessor`, `PredictionResult` |
| **Hàm / Phương thức** | `snake_case()` | `fetch_usgs_feed()`, `resample_data()` |
| **Biến nội bộ** | `snake_case` | `event_count`, `latest_timestamp` |
| **Hằng số (Constants)** | `UPPER_SNAKE_CASE` | `USGS_FEED_URL`, `MAX_RETRIES` |

### 2.4. Xử lý Ngoại lệ & Logging
- **Tuyệt đối không dùng `print()`** trong mã nguồn Backend; sử dụng module logging chuẩn:
  ```python
  import logging

  logger = logging.getLogger(__name__)

  try:
      # Thực thi nghiệp vụ
      logger.info("Bắt đầu chu kỳ phân tích xu hướng (Trend Analysis)...")
  except Exception as exc:
      logger.error("Lỗi khi tính toán phân tích chuỗi thời gian: %s", exc, exc_info=True)
      raise DataProcessingError("Không thể tính toán chuỗi dữ liệu") from exc
  ```
- Định nghĩa các Exception tùy biến rõ ràng kế thừa từ `GDMASBaseException`.

---

## 3. Quy chuẩn Frontend React & TypeScript (`apps/web`)

### 3.1. Tiêu chuẩn Mã nguồn
- **Công nghệ:** React 18+, TypeScript (Strict Mode bật), Vite.
- **Kiến trúc:** Functional Components kết hợp React Hooks. **Không sử dụng Class Components**.
- **Tuyệt đối cấm sử dụng kiểu `any`:** Mọi đối tượng dữ liệu API phải có Interface hoặc Type rõ ràng trong `src/contracts/` hoặc `src/types/`.

### 3.2. Phân tách Giao tiếp API
- Tuyệt đối không gọi trực tiếp URL hoặc gọi hàm `fetch` / `axios` rải rác bên trong các component giao diện.
- Toàn bộ lời gọi mạng phải đi qua lớp API Service:
  ```typescript
  // src/lib/api-client.ts hoặc src/features/statistics/api.ts
  export async function getTemporalAnalysis(interval: string): Promise<TemporalAnalysisResponse> {
    const response = await apiClient.get(`/analysis/temporal?interval=${interval}`);
    return response.data;
  }
  ```

### 3.3. Tiêu chuẩn Thẩm mỹ Giao diện (Aesthetic UI)
Theo yêu cầu bắt buộc của đồ án, giao diện Frontend phải đảm bảo:
- **Tính thẩm mỹ cao:** Bố cục hiện đại, màu sắc khoa học (phân biệt rõ độ lớn động đất bằng mã màu nhiệt độ), khoảng cách lề và font chữ hài hòa.
- **Độ bao phủ trực quan:** Hiển thị trọn vẹn bản đồ động đất toàn cầu tương tác cùng đầy đủ 6 nhóm phân tích Time-Series.
- **Bộ lọc linh hoạt:** Cung cấp thanh công cụ lọc khoảng thời gian tương tác mượt mà (Ngày / Tuần / Tháng).
- **Trạng thái giao diện đầy đủ:** Luôn xử lý 3 trạng thái:
  - *Loading State:* Spinner hoặc Skeleton placeholder khi đang tải dữ liệu.
  - *Error State:* Thông báo lỗi trực quan kèm nút bấm thử lại (Retry).
  - *Empty State:* Hình ảnh hoặc lời nhắc thân thiện khi không có dữ liệu phù hợp bộ lọc.

### 3.4. Quy ước Đặt tên Frontend
| Thành phần | Quy ước | Ví dụ |
| :--- | :--- | :--- |
| **Component Files** | `PascalCase.tsx` | `EarthquakeMap.tsx`, `TrendAnalysisChart.tsx` |
| **Page Files** | `PascalCase.tsx` | `DashboardPage.tsx`, `AnalysisPage.tsx` |
| **Hooks** | `camelCase.ts` (tiền tố `use`) | `useEarthquakes.ts`, `usePrediction.ts` |
| **Utility Functions** | `camelCase.ts` | `formatDate.ts`, `calculateSeverityColor.ts` |
| **Interfaces / Types** | `PascalCase` | `EarthquakeEvent`, `TemporalChartProps` |

---

## 4. Quy chuẩn Cơ sở dữ liệu PostgreSQL & Alembic

- **Tên bảng:** Viết thường `snake_case`, sử dụng danh từ số nhiều: `earthquake_events`, `analysis_results`, `service_runs`.
- **Tên cột:** Viết thường `snake_case`: `event_time`, `depth_km`, `source_event_id`.
- **Khóa chính:** Đặt tên là `id` với kiểu `BIGSERIAL`.
- **Khóa ngoại:** Đặt tên theo cú pháp `<tên_thực_thể_số_ít>_id`: `cluster_result_id`, `service_run_id`.
- **Quy tắc Migration:** Mọi thay đổi cấu trúc bảng bắt buộc phải tạo file migration mới thông qua Alembic, không chỉnh sửa trực tiếp DB hoặc sửa migration cũ.

---

## 5. Quy chuẩn Commit Message (Conventional Commits)

Tất cả các thành viên phải tuân thủ cú pháp Conventional Commits:

```text
<type>(<scope>): <mô tả ngắn gọn ở thì hiện tại>
```

### Các tiền tố (`type`) bắt buộc:
- `feat`: Bổ sung tính năng mới, router mới, biểu đồ mới.
- `fix`: Sửa lỗi phát sinh trong mã nguồn hoặc xử lý dữ liệu.
- `docs`: Cập nhật tài liệu kỹ thuật, hướng dẫn.
- `refactor`: Tái cấu trúc code nội bộ mà không đổi hành vi API.
- `test`: Viết thêm unit test hoặc integration test.
- `chore`: Cập nhật cấu hình môi trường, script kiểm thử, docker-compose.

### Ví dụ hợp lệ:
```text
feat(analysis): add seasonal line decomposition calculation
feat(web): add correlation matrix heatmap component
fix(ingestion): handle null depth value from usgs payload
docs(api): document time-series prediction endpoints
test(clustering): add unit tests for dbscan spatial radius
```

