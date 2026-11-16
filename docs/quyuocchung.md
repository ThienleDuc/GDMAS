# TEAM DEVELOPMENT CONVENTIONS

# QUY ƯỚC PHÁT TRIỂN VÀ PHỐI HỢP NHÓM

**Dự án:** Global Disaster Monitoring & Analysis System (GDMAS)  
**Phiên bản:** 1.0  
**Trạng thái:** Draft / Pending Approval  
**Phạm vi áp dụng:** Toàn bộ thành viên phát triển dự án  
**Thời gian áp dụng:** Toàn bộ vòng đời phát triển sản phẩm

---

# I. MỤC ĐÍCH VÀ NGUYÊN TẮC CHUNG

## 1. Mục đích

Tài liệu quy định các tiêu chuẩn và quy ước thống nhất trong quá trình phát triển GDMAS nhằm:

- Đảm bảo tất cả thành viên tuân thủ cùng một kiến trúc.
- Thống nhất cách tổ chức mã nguồn và thư mục.
- Hạn chế xung đột khi làm việc đồng thời.
- Đảm bảo khả năng tích hợp giữa các service.
- Thống nhất cấu trúc dữ liệu và giao tiếp API.
- Đảm bảo hệ thống có thể chạy trên môi trường của tất cả thành viên.
- Dễ dàng kiểm thử, bảo trì và bàn giao sản phẩm.

## 2. Nguyên tắc bắt buộc

| Mã      | Nguyên tắc | Quy định                                                                                               |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------ |
| RULE-01 | Kiến trúc  | Tuân thủ mô hình Microservices/Modular: 7 khối độc lập chạy ở 7 terminal riêng biệt theo yêu cầu đồ án |
| RULE-02 | Công nghệ  | Tuân thủ Python, PostgreSQL, React/Vite và Docker                                                      |
| RULE-03 | Mã nguồn   | **Không sửa mã nguồn hiện tại, chỉ bổ sung thêm mới** (Open-Closed Principle: Bảo toàn code gốc)       |
| RULE-04 | Git        | Mọi thay đổi mã nguồn phải được quản lý bằng Git qua Pull Request                                      |
| RULE-05 | Database   | Sử dụng kho dữ liệu PostgreSQL tập trung, thay đổi qua Alembic Migration                               |
| RULE-06 | API        | Tuân thủ hợp đồng API đã thống nhất, mở rộng thêm router không phá vỡ router cũ                       |
| RULE-07 | Service    | Mỗi service phải có entrypoint riêng và chạy độc lập trên 1 terminal riêng                             |
| RULE-08 | Phân tích  | Thực hiện trọn vẹn 6 patterns phân tích Time-Series bắt buộc                                          |
| RULE-09 | Giao diện  | Frontend yêu cầu thẩm mỹ cao, trực quan 6 patterns, hỗ trợ lọc linh hoạt theo thời gian                |
| RULE-10 | Bảo mật    | Tuyệt đối không đưa thông tin bí mật (.env, secret key) lên GitHub                                     |

**Quy tắc:** Không tự ý sửa đổi code gốc đang hoạt động, không phá vỡ cấu trúc Database hoặc hợp đồng API. Mọi tính năng mới đều được triển khai theo hướng bổ sung thêm mới.

---

# II. QUY TẮC BẢO TOÀN VÀ MỞ RỘNG MÃ NGUỒN (KHÔNG SỬA CODE HIỆN TẠI - CHỈ BỔ SUNG THÊM)

## 3. Nguyên tắc Open-Closed trong phát triển dự án

Nhằm đảm bảo hệ thống vận hành ổn định, không gây lỗi dây chuyền (regression bugs) và tránh xung đột khi làm việc nhóm, dự án áp dụng quy tắc: **Đóng với việc sửa đổi mã nguồn sẵn có, Mở với việc bổ sung mã nguồn mới**.

### 3.1. Quy định không sửa mã nguồn hiện tại (Closed for Modification)

- **Bảo toàn các tệp và module gốc:** Tất cả các tệp mã nguồn, lớp, hàm, cấu hình và interface đã được thiết lập trong repository (thuộc `apps/api`, `apps/web`, `infra/`, `scripts/`) phải được bảo toàn nguyên trạng.
- **Không phá vỡ hợp đồng giao tiếp:** 
  - Không xóa tệp hoặc đổi tên tệp hiện hữu.
  - Không thay đổi tên hàm, tham số hoặc kiểu dữ liệu trả về (signature) của các hàm đã có mà các module khác đang gọi.
  - Không can thiệp hoặc sửa đổi logic bên trong các tệp lõi trừ khi có sự đồng thuận từ toàn bộ nhóm khi phát hiện lỗi nghiêm trọng.
- **Không tự ý refactor diện rộng:** Không tự ý thay đổi cấu trúc mã nguồn đang ổn định của thành viên khác.

### 3.2. Quy định bổ sung thêm mới (Open for Extension)

Khi cần phát triển tính năng mới, giải thuật mới hoặc mở rộng hệ thống, thành viên bắt buộc phải triển khai theo phương thức **bổ sung thêm mới**:

- **Bổ sung Service Runners (Đáp ứng yêu cầu chạy 7 terminals độc lập):**
  - Trong `apps/api/src/gdmas/services/`, mỗi service (`ingestion`, `analysis`, `clustering`, `prediction`) bổ sung một file runner/entrypoint riêng (ví dụ `runner.py`, `worker.py`) có thể chạy trực tiếp từ dòng lệnh mà không làm sửa đổi `main.py`.
- **Bổ sung API Routes & Endpoints:**
  - Tạo tệp route mới trong `apps/api/src/gdmas/api/routes/` và đăng ký vào router chung mà không làm sửa đổi các router hiện có.
- **Bổ sung Pydantic Schemas & ORM Models:**
  - Bổ sung các schema mới trong `schemas/` và model mới trong `models/`.
  - Mọi thay đổi cấu trúc bảng trong PostgreSQL phải tạo file migration mới (`alembic revision --autogenerate`) chứ không sửa trực tiếp DB.
- **Bổ sung Frontend Components & Charts:**
  - Bổ sung các UI component mới trong `apps/web/src/components/`, các biểu đồ phân tích mới trong `components/charts/`, và các tính năng mới trong `features/` mà không ghi đè lên component cũ.
- **Bổ sung Script & Tiện ích:**
  - Bổ sung các shell script hỗ trợ tự động hóa trong `scripts/` (`dev.sh`, `test.sh`).
- **Bổ sung Tests:**
  - Bổ sung thêm các test cases mới trong `tests/unit` và `tests/integration` để bảo đảm độ bao phủ mã nguồn.

## 4. Quy ước đặt tên

### 4.1. Python

| Thành phần | Quy ước          | Ví dụ                 |
| ---------- | ---------------- | --------------------- |
| File       | snake_case       | `data_ingestion.py`   |
| Function   | snake_case       | `fetch_earthquakes()` |
| Variable   | snake_case       | `event_time`          |
| Class      | PascalCase       | `EarthquakeProcessor` |
| Constant   | UPPER_SNAKE_CASE | `MAX_RETRY`           |
| Package    | snake_case       | `data_analysis`       |

### 4.2. Frontend – React/TypeScript

| Thành phần     | Quy ước                | Ví dụ               |
| -------------- | ---------------------- | ------------------- |
| Component      | PascalCase             | `EarthquakeMap.tsx` |
| Page           | PascalCase             | `DashboardPage.tsx` |
| Hook           | camelCase, tiền tố use | `useEarthquakes.ts` |
| Function       | camelCase              | `getEarthquakes()`  |
| Variable       | camelCase              | `eventTime`         |
| Interface/Type | PascalCase             | `EarthquakeEvent`   |
| Constant       | UPPER_SNAKE_CASE       | `API_BASE_URL`      |

### 4.3. Database

| Thành phần  | Quy ước                 | Ví dụ                              |
| ----------- | ----------------------- | ---------------------------------- |
| Table       | snake_case, số nhiều    | `earthquake_events`                |
| Column      | snake_case              | `event_time`                       |
| Primary Key | id                      | `id`                               |
| Foreign Key | tên trường + `_id`      | `event_id`                         |
| Index       | idx_tên_bảng_tên_trường | `idx_earthquake_events_event_time` |
| Unique      | uq_tên_bảng_tên_trường  | `uq_earthquake_source_id`          |

### 4.4. Docker và cấu hình

- Tên service Docker sử dụng chữ thường và dấu gạch ngang hoặc gạch dưới nhất quán.
- Tên biến môi trường sử dụng `UPPER_SNAKE_CASE`.
- Tên file cấu hình sử dụng chữ thường.
- Không đặt tên file có dấu tiếng Việt hoặc khoảng trắng.

---

# III. QUY ƯỚC LẬP TRÌNH

## 5. Quy chuẩn Python Backend

### 5.1. Tiêu chuẩn mã nguồn

- Sử dụng Python 3.x theo phiên bản nhóm thống nhất.
- Sử dụng type hints cho các hàm nghiệp vụ và interface quan trọng.
- Ưu tiên function có một trách nhiệm rõ ràng.
- Hạn chế function quá dài hoặc chứa nhiều logic không liên quan.
- Không sử dụng biến toàn cục để lưu trạng thái nghiệp vụ.
- Không hardcode thông tin cấu hình.
- Xử lý ngoại lệ rõ ràng.
- Sử dụng logging thay vì `print()` trong mã nguồn vận hành.

### 5.2. Công cụ chuẩn hóa

| Công cụ        | Mục đích                          |
| -------------- | --------------------------------- |
| Ruff           | Lint và kiểm tra quy tắc mã nguồn |
| Ruff Formatter | Định dạng Python                  |
| Pytest         | Kiểm thử                          |
| Type Hints     | Kiểm soát kiểu dữ liệu            |

Tất cả thành viên Backend phải sử dụng chung cấu hình Ruff và chạy kiểm thử trước khi tạo Pull Request.

### 5.3. Cấu trúc module

Mỗi service nên phân tách:

- Entry Point: Điểm khởi chạy.
- Config: Cấu hình.
- Services: Logic nghiệp vụ.
- Repositories: Truy cập dữ liệu.
- Schemas: Kiểu dữ liệu đầu vào và đầu ra.
- Tests: Kiểm thử.

Không bắt buộc tạo đầy đủ các thư mục nếu service nhỏ, nhưng phải đảm bảo phân tách trách nhiệm.

## 6. Quy chuẩn Frontend

- Sử dụng React + TypeScript.
- Sử dụng functional components và React Hooks.
- Tách component giao diện khỏi logic gọi API.
- Không gọi API trực tiếp ở nhiều component nếu có thể tái sử dụng service.
- Không hardcode dữ liệu giả trong giao diện chính thức.
- Có trạng thái Loading, Error và Empty State.
- Có kiểm tra kiểu dữ liệu từ API.
- Sử dụng component dùng chung cho các thành phần giao diện lặp lại.
- Thống nhất cách quản lý CSS và thiết kế giao diện.

### 6.1. Cấu trúc xử lý API

Frontend phải sử dụng lớp API Client hoặc các module dịch vụ riêng.

Ví dụ:

```text
src/
├── services/
│   ├── apiClient.ts
│   ├── earthquakeService.ts
│   ├── analysisService.ts
│   └── predictionService.ts
```

Không đặt URL API rải rác trong các component.

## 7. Quy chuẩn chất lượng mã nguồn

Mã nguồn phải đáp ứng:

- Dễ đọc.
- Dễ hiểu.
- Có cấu trúc.
- Không trùng lặp không cần thiết.
- Có xử lý lỗi.
- Có thể kiểm thử.
- Không chứa mã nguồn thử nghiệm không sử dụng.
- Không để lại đoạn code bị comment kéo dài mà không có lý do.

Comment chỉ sử dụng khi cần giải thích logic, thuật toán hoặc quyết định kỹ thuật khó hiểu.

---

# IV. QUY ƯỚC GIT VÀ GITHUB

## 8. Quản lý repository

GitHub là nền tảng quản lý mã nguồn chính thức của nhóm.

Quy định:

- Mỗi thành viên sử dụng tài khoản GitHub cá nhân.
- Không làm việc trực tiếp trên nhánh `main`.
- Mỗi công việc phải có nhánh riêng.
- Không commit file cấu hình bí mật.
- Không tự ý xóa hoặc ghi đè công việc của thành viên khác.
- Không đưa mã nguồn chưa kiểm thử vào nhánh chính.

## 9. Quy ước đặt tên Branch

Sử dụng cấu trúc:

```text
<type>/<short-description>
```

Các loại branch:

| Type     | Mục đích                                                                                      | Ví dụ                       |
| -------- | --------------------------------------------------------------------------------------------- | --------------------------- |
| main     | Chứa phiên bản ổn định, đã kiểm thử và sẵn sàng bàn giao                                      | `main`                      |
| develop  | Nhánh phát triển tích hợp chính, tập hợp các chức năng đã hoàn thành trước khi đưa vào `main` | `develop`                   |
| feature  | Phát triển chức năng mới                                                                      | `feature/earthquake-map`    |
| fix      | Sửa lỗi                                                                                       | `fix/ingestion-duplicate`   |
| refactor | Tái cấu trúc mã nguồn                                                                         | `refactor/analysis-service` |
| docs     | Cập nhật tài liệu                                                                             | `docs/update-sad`           |
| test     | Bổ sung hoặc cập nhật kiểm thử                                                                | `test/earthquake-api`       |
| chore    | Công việc cấu hình, bảo trì và công cụ                                                        | `chore/docker-setup`        |

## 10. Quy ước Commit

Sử dụng Conventional Commits.

Cấu trúc:

```text
<type>(<scope>): <description>
```

Các loại commit:

| Type     | Ý nghĩa                       |
| -------- | ----------------------------- |
| feat     | Thêm chức năng                |
| fix      | Sửa lỗi                       |
| refactor | Tái cấu trúc                  |
| docs     | Tài liệu                      |
| test     | Kiểm thử                      |
| style    | Định dạng mã nguồn            |
| chore    | Cấu hình và công việc phụ trợ |
| perf     | Tối ưu hiệu năng              |

Ví dụ:

```text
feat(ingestion): add USGS data collection
fix(database): prevent duplicate earthquake events
feat(api): add earthquake statistics endpoint
refactor(analysis): separate trend calculation
docs(sad): update system architecture
test(prediction): add forecasting unit tests
```

Quy định:

- Mỗi commit tập trung vào một mục đích.
- Không sử dụng nội dung commit chung chung như `update`, `fix`, `done`.
- Không gộp nhiều chức năng không liên quan vào một commit.
- Không commit mã nguồn đang lỗi nếu chưa có lý do được thống nhất.

## 11. Pull Request và Code Review

Mọi thay đổi đưa vào `main` phải thông qua Pull Request.

### 11.1. Nội dung Pull Request

Mỗi PR phải có:

- Tiêu đề rõ ràng.
- Mục đích thay đổi.
- Danh sách nội dung đã thực hiện.
- Kết quả kiểm thử.
- Ảnh minh họa nếu thay đổi giao diện.
- Ảnh hưởng đến API hoặc Database nếu có.

### 11.2. Quy trình

1. Thành viên tạo branch.
2. Phát triển chức năng.
3. Kiểm thử cục bộ.
4. Commit và push lên GitHub.
5. Tạo Pull Request.
6. Thành viên khác hoặc người phụ trách kỹ thuật review.
7. Sửa các vấn đề được phản hồi.
8. Merge vào `main`.

### 11.3. Điều kiện Merge

- Mã nguồn không có lỗi nghiêm trọng đã biết.
- Đã chạy kiểm thử liên quan.
- Không chứa thông tin bí mật.
- Không phá vỡ API hoặc cấu trúc dữ liệu đã thống nhất.
- PR được người có trách nhiệm chấp thuận.

---

# V. QUY ƯỚC DATABASE

## 12. Quản lý PostgreSQL

PostgreSQL là cơ sở dữ liệu tập trung của hệ thống.

Quy định:

- Sử dụng một cấu hình Database thống nhất.
- Không tự tạo Database riêng cho từng service nếu chưa được thống nhất.
- Các service dùng chung quy ước truy cập dữ liệu.
- Không tự ý sửa bảng đang được service khác sử dụng.
- Không thay đổi tên cột hoặc kiểu dữ liệu mà không thông báo nhóm.
- Sử dụng migration để quản lý thay đổi cấu trúc Database.

## 13. Quy định thay đổi Schema

Mọi thay đổi Database phải:

1. Xác định lý do thay đổi.
2. Đánh giá ảnh hưởng đến các service.
3. Cập nhật ERD.
4. Tạo migration.
5. Kiểm thử migration.
6. Thông báo các thành viên liên quan.
7. Cập nhật tài liệu dữ liệu.

Sử dụng Alembic để quản lý migration trong Backend Python.

Không chỉnh sửa trực tiếp Database dùng chung mà không cập nhật migration tương ứng.

## 14. Quy ước dữ liệu

| Nội dung  | Quy định                    |
| --------- | --------------------------- |
| Timezone  | UTC                         |
| Thời gian | TIMESTAMPTZ                 |
| Latitude  | WGS84                       |
| Longitude | WGS84                       |
| Depth     | Kilometers                  |
| Magnitude | Numeric value               |
| Source ID | Giữ nguyên mã sự kiện nguồn |
| Raw Data  | JSONB khi cần               |
| Duplicate | UNIQUE + UPSERT             |

Đối với sự kiện động đất:

```text
UNIQUE(source, source_event_id)
```

Tất cả thành viên phải sử dụng thống nhất cách hiểu và đơn vị của dữ liệu.

Không tự ý chuyển đổi đơn vị hoặc thay đổi ý nghĩa trường dữ liệu.

---

# VI. QUY ƯỚC API VÀ GIAO TIẾP SERVICE

## 15. Quy chuẩn REST API

- Sử dụng HTTP REST.
- Trao đổi dữ liệu JSON.
- Sử dụng danh từ cho tài nguyên.
- Sử dụng HTTP Method đúng mục đích.
- Có kiểm tra tham số.
- Có phân trang khi trả về danh sách.
- Có cấu trúc lỗi thống nhất.
- Có tài liệu API cập nhật.

Ví dụ:

```text
GET /api/earthquakes
GET /api/earthquakes/{id}
GET /api/statistics/earthquakes
GET /api/analysis/trend
GET /api/predictions
GET /api/classifications
```

## 16. Quy chuẩn phản hồi API

Phản hồi thành công:

```json
{
  "success": true,
  "data": {},
  "metadata": {}
}
```

Phản hồi thất bại:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```

Không tự ý thay đổi cấu trúc phản hồi API mà không thông báo Frontend và các thành viên liên quan.

## 17. Quy chuẩn giao tiếp giữa các service

Các service xử lý dữ liệu sử dụng PostgreSQL làm phương thức trao đổi dữ liệu trong MVP.

Quy định:

- Không tự ý tạo API nội bộ giữa các service.
- Không truy cập trực tiếp vào bảng không thuộc phạm vi trách nhiệm nếu không cần thiết.
- Phải thống nhất schema dữ liệu đầu vào và đầu ra.
- Không ghi đè dữ liệu kết quả của service khác.
- Kết quả xử lý phải có thời gian tạo và thông tin phương pháp.
- Các service phải xử lý được trường hợp dữ liệu chưa có hoặc chưa cập nhật.

---

# VII. QUY ƯỚC SERVICE VÀ DOCKER

## 18. Quy định triển khai 7 Service độc lập

Theo yêu cầu bắt buộc của đồ án (Mô hình Microservices/Modular): **Mỗi khối trong kiến trúc hệ thống phải được chạy ở một terminal riêng biệt như một service độc lập**.

| STT | Khối Service | Tiến trình / Entrypoint | Chu kỳ / Tần suất | Terminal phát triển cục bộ | Vai trò & Trách nhiệm |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **1** | **PostgreSQL** | Container Docker `postgres:16-alpine` | Luôn chạy | **Terminal 1:** `docker compose up postgres` | Kho lưu trữ dữ liệu Time-Series tập trung |
| **2** | **Data Ingestion** | Python Worker (`gdmas.services.ingestion.runner`) | **5 phút / lần** | **Terminal 2:** `python -m gdmas.services.ingestion.runner` | Thu thập dữ liệu từ USGS, khử trùng lặp và lưu trữ |
| **3** | **Data Analysis** | Python Worker (`gdmas.services.analysis.runner`) | **5 phút / lần** | **Terminal 3:** `python -m gdmas.services.analysis.runner` | Xử lý Time-Series: Trend, Seasonality, Correlation |
| **4** | **Clustering** | Python Worker (`gdmas.services.clustering.runner`) | **1 ngày / lần** | **Terminal 4:** `python -m gdmas.services.clustering.runner` | Phân cụm sự kiện địa chấn (DBSCAN / K-Means) |
| **5** | **Prediction** | Python Worker (`gdmas.services.prediction.runner`) | **5 phút / lần** | **Terminal 5:** `python -m gdmas.services.prediction.runner` | Dự báo định lượng ($t + 1$) và phân loại địa chấn ($t + 1$) |
| **6** | **Database API** | FastAPI Server (`gdmas.main:app`) | Luôn chạy | **Terminal 6:** `uv run uvicorn gdmas.main:app --port 8000` | Cung cấp REST API chuẩn cho Frontend truy vấn |
| **7** | **Frontend Client** | React + Vite UI (`apps/web`) | Luôn chạy | **Terminal 7:** `pnpm dev --port 3000` | Giao diện thẩm mỹ cao, hiển thị trọn vẹn 6 patterns |

Mỗi service phải:

- Có entrypoint riêng (bổ sung file runner riêng biệt, không sửa đổi code lõi).
- Có cấu hình riêng khi cần (đọc từ biến môi trường `.env`).
- Có log riêng ghi nhận thời điểm bắt đầu/kết thúc tác vụ.
- Có thể khởi động độc lập và dừng độc lập mà không làm chết service khác.
- Không phụ thuộc vào terminal của service khác.
- Không chứa logic nghiệp vụ của service khác (tách bạch rõ ràng theo đúng nguyên tắc Microservices).

## 19. Quy định Docker

- Mỗi service có cấu hình chạy riêng.
- Các service được quản lý thống nhất bằng Docker Compose.
- Không đưa `.env` vào Docker image.
- PostgreSQL sử dụng persistent volume.
- Sử dụng Docker network nội bộ.
- Không công khai cổng Database nếu không cần thiết.
- Không sử dụng `localhost` để kết nối giữa các container; sử dụng tên service trong Docker network.
- Phải có hướng dẫn chạy và dừng hệ thống.

## 20. Quy trình kiểm tra trước khi bàn giao

Mỗi thành viên phải đảm bảo:

- Service khởi động thành công.
- Kết nối Database hoạt động.
- Không có lỗi cấu hình.
- Các chức năng chính hoạt động.
- Log được ghi nhận.
- Có hướng dẫn chạy nếu có thay đổi cấu hình.
- Có thể chạy trong môi trường Docker đã thống nhất.

---

# VIII. QUY ƯỚC PHÂN TÍCH VÀ MACHINE LEARNING

## 21. Quy chuẩn 6 Patterns Phân Tích Bắt Buộc (Time-Series Data)

Tất cả các dịch vụ xử lý dữ liệu và giao diện Frontend bắt buộc phải đáp ứng trọn vẹn 6 patterns phân tích theo chuẩn yêu cầu đồ án:

| STT | Nhóm Phân Tích | Chi Tiết Biểu Đồ & Yêu Cầu Kỹ Thuật | Tần Suất / Phạm Vi |
| :---: | :--- | :--- | :---: |
| **1** | **Biểu diễn theo thời gian** | Vẽ **3 biểu đồ** tương ứng với các quãng thời gian:<br>• `Line chart` (Đường xu hướng số lượng/magnitude)<br>• `Scatter plot` (Phân tán điểm)<br>• `Histogram` (Phân phối tần suất độ lớn/độ sâu) | Ngày / Tuần / Tháng |
| **2** | **Trend Analysis** | Biểu diễn xu hướng (Trend) của dữ liệu sau khi thực hiện **Re-sampling** | Tháng *(hoặc Tuần nếu thiếu dữ liệu)* |
| **3** | **Seasonality** | Biểu diễn tính chu kỳ / mùa vụ (**Seasonal line**) sau khi thực hiện **Re-sampling** | Tháng *(hoặc Tuần nếu thiếu dữ liệu)* |
| **4** | **Tương quan (Correlation)** | Ma trận tương quan (**Correlation Matrix / Heatmap**) giữa các biến đo đạc | Đa biến |
| **5** | **Hồi quy & Dự báo** | Hiển thị giá trị dự báo định lượng cho ngày tiếp theo ($t + 1$) | Ngày kế tiếp ($t + 1$) |
| **6** | **Phân loại (Classification)** | Hiển thị nhãn phân loại dự đoán cho ngày tiếp theo ($t + 1$) | Ngày kế tiếp ($t + 1$) |

## 22. Quy chuẩn xử lý dữ liệu

- Không tự ý thay đổi dữ liệu gốc.
- Phải xác định rõ dữ liệu thiếu và cách xử lý (imputation / interpolation).
- Phải thống nhất cách resampling (theo ngày/tuần/tháng) trước khi phân tích xu hướng hoặc mùa vụ.
- Phải ghi rõ đơn vị và khoảng thời gian phân tích trên từng biểu đồ.
- Không tùy tiện loại bỏ dữ liệu ngoại lệ mà không có căn cứ thống kê.
- Các bước tiền xử lý phải có thể tái hiện được bằng script/code.

## 23. Quy chuẩn thuật toán

Mọi thuật toán phải có:

- Mục tiêu xử lý.
- Dữ liệu đầu vào.
- Các bước tiền xử lý.
- Phương pháp sử dụng.
- Kết quả đầu ra.
- Chỉ số đánh giá phù hợp.
- Giới hạn của phương pháp.

## 24. Quy chuẩn dự báo và phân loại ($t + 1$)

- Không sử dụng dữ liệu tương lai trong quá trình huấn luyện (tránh data leakage).
- Chia tập dữ liệu train/test tuần tự theo trục thời gian.
- Có mô hình baseline đơn giản để so sánh hiệu năng.
- Ghi nhận đầy đủ sai số (MAE, RMSE, F1-score, Precision/Recall).
- Phân biệt rõ rệt dữ liệu quan sát thực tế và kết quả dự báo trên giao diện.
- Tuyệt đối không tuyên bố dự báo chính xác thời điểm xảy ra động đất riêng lẻ.

## 25. Quy chuẩn lưu trữ kết quả phân tích

Mỗi kết quả phân tích khi ghi vào PostgreSQL cần xác định rõ:

- Service tạo kết quả (Analysis, Clustering, Prediction).
- Khoảng thời gian dữ liệu đầu vào.
- Thời điểm xử lý (created_at).
- Phương pháp sử dụng.
- Phiên bản thuật toán hoặc mô hình khi phù hợp.
- Trạng thái xử lý (Success / Failure / Incomplete).

---

# IX. QUY ƯỚC KIỂM THỬ VÀ TÀI LIỆU

## 26. Kiểm thử

Mỗi thành viên chịu trách nhiệm kiểm thử phần việc của mình.

| Loại kiểm thử    | Nội dung                     |
| ---------------- | ---------------------------- |
| Unit Test        | Kiểm thử logic riêng lẻ      |
| Integration Test | Kiểm thử Database và service |
| API Test         | Kiểm thử endpoint            |
| End-to-End Test  | Kiểm thử luồng toàn hệ thống |

Không đưa chức năng mới vào nhánh chính khi chưa kiểm tra các trường hợp quan trọng.

## 27. Tài liệu

Các thay đổi sau phải cập nhật tài liệu tương ứng:

| Thay đổi            | Tài liệu cần cập nhật     |
| ------------------- | ------------------------- |
| Thay đổi kiến trúc  | SAD                       |
| Thay đổi Database   | ERD                       |
| Thay đổi API        | API Specification         |
| Thay đổi thuật toán | Analysis Documentation    |
| Thay đổi môi trường | README / Deployment Guide |
| Thay đổi kiểm thử   | Testing Documentation     |

Không để tài liệu mô tả khác với hệ thống thực tế.

---

# X. QUY ƯỚC PHỐI HỢP NHÓM

## 28. Phân công trách nhiệm

Mỗi công việc phải có một người chịu trách nhiệm chính.

Quy định:

- Một task có một người chịu trách nhiệm chính.
- Có thể có người hỗ trợ.
- Không để hai thành viên cùng sửa một module mà không thống nhất.
- Người phụ trách module chịu trách nhiệm kiểm tra và bàn giao.
- Các thay đổi ảnh hưởng module khác phải thông báo trước.

## 29. Giao tiếp và báo cáo tiến độ

Mỗi thành viên cần cập nhật:

- Công việc đã hoàn thành.
- Công việc đang thực hiện.
- Khó khăn gặp phải.
- Những thay đổi kỹ thuật.
- Công việc cần thành viên khác hỗ trợ.

Khi gặp vấn đề ảnh hưởng kiến trúc, Database hoặc API, phải thông báo nhóm trước khi tự ý thay đổi.

## 30. Xử lý xung đột

Khi phát sinh bất đồng:

1. Xác định vấn đề kỹ thuật.
2. Đánh giá ảnh hưởng đến kiến trúc.
3. Đưa ra phương án.
4. Thảo luận với các thành viên liên quan.
5. Người phụ trách kỹ thuật tổng hợp quyết định.
6. Cập nhật tài liệu nếu quyết định làm thay đổi thiết kế.

Không tự ý áp dụng giải pháp có thể phá vỡ tính tương thích của hệ thống.

---

# XI. DEFINITION OF DONE – TIÊU CHUẨN HOÀN THÀNH CÔNG VIỆC

## 31. Điều kiện hoàn thành một task

Một task chỉ được xem là hoàn thành khi:

- [ ] Đúng yêu cầu được giao.
- [ ] Tuân thủ nguyên tắc bảo toàn mã nguồn: **Không sửa đổi mã nguồn hiện có, chỉ bổ sung thêm mới**.
- [ ] Không gây ảnh hưởng hoặc breaking changes đến các chức năng hiện có.
- [ ] Đã kiểm thử chức năng (unit test / manual test).
- [ ] Không còn lỗi nghiêm trọng đã biết.
- [ ] Đã commit theo chuẩn Conventional Commits và push lên GitHub.
- [ ] Đã tạo Pull Request và được review, chấp thuận.
- [ ] Đã cập nhật tài liệu kỹ thuật liên quan (nếu có bổ sung API, schema).

## 32. Điều kiện hoàn thành một service

- [ ] Có entrypoint riêng (file runner độc lập).
- [ ] Có khả năng **chạy độc lập tại một terminal riêng biệt** theo mô hình Microservices/Modular.
- [ ] Kết nối đúng PostgreSQL thông qua `DATABASE_URL`.
- [ ] Có cấu hình môi trường qua `.env`.
- [ ] Có logging ghi nhận thời gian bắt đầu, chu kỳ và kết thúc.
- [ ] Có cơ chế xử lý lỗi và retry giới hạn, không làm dừng tiến trình.
- [ ] Có kiểm thử cơ bản (unit tests).
- [ ] Hoạt động đúng chu kỳ quy định (Ingestion: 5p, Analysis: 5p, Clustering: 1 ngày, Prediction: 5p).

## 33. Điều kiện hoàn thành toàn bộ hệ thống

- [ ] Toàn bộ 7 khối dịch vụ hoạt động độc lập và trơn tru trên 7 terminals riêng biệt (hoặc qua Docker Compose).
- [ ] Data Ingestion tự động thu thập được dữ liệu thực từ USGS chu kỳ 5 phút/lần.
- [ ] PostgreSQL lưu trữ dữ liệu chính xác, khử trùng lặp qua Upsert.
- [ ] **Đáp ứng trọn vẹn 6 nhóm phân tích Time-Series bắt buộc:**
  1. Biểu diễn theo thời gian (3 biểu đồ: Line chart, Scatter plot, Histogram) theo Ngày / Tuần / Tháng.
  2. Trend Analysis (Đường xu hướng sau khi Re-sampling Tháng/Tuần).
  3. Seasonality (Chu kỳ mùa vụ - Seasonal line sau khi Re-sampling Tháng/Tuần).
  4. Tương quan (Correlation Matrix / Heatmap đa biến).
  5. Hồi quy & Dự báo định lượng cho ngày kế tiếp ($t + 1$).
  6. Phân loại mức độ hoạt động địa chấn cho ngày kế tiếp ($t + 1$).
- [ ] **Giao diện Frontend đạt yêu cầu thẩm mỹ cao**, bố cục hiện đại, trực quan đầy đủ 6 patterns, hỗ trợ lọc thời gian mượt mà.
- [ ] Database API cung cấp endpoints chuẩn xác, có tài liệu API Swagger / Redoc.
- [ ] Docker Compose khởi chạy toàn bộ hệ thống thành công.
- [ ] Repository GitHub đầy đủ mã nguồn và tài liệu.
- [ ] Có hướng dẫn cài đặt, chạy và kiểm thử rõ ràng trong `setup.md`.

---

# XII. QUẢN LÝ VÀ PHÊ DUYỆT QUY ƯỚC

## 34. Nguyên tắc áp dụng

- Tất cả thành viên phải đọc và thống nhất quy ước trước khi phát triển.
- Không tự ý bỏ qua quy định.
- Các ngoại lệ phải được trao đổi và thống nhất.
- Quy ước có thể cập nhật khi kiến trúc thay đổi.
- Mọi phiên bản cập nhật phải được lưu trên GitHub.

## 35. Phê duyệt

| Vai trò                  | Người phụ trách | Trạng thái |
| ------------------------ | --------------- | ---------- |
| Người soạn thảo          | [Tên]           | Pending    |
| Người phụ trách kỹ thuật | [Tên]           | Pending    |
| Thành viên 1             | [Tên]           | Pending    |
| Thành viên 2             | [Tên]           | Pending    |
| Thành viên 3             | [Tên]           | Pending    |
| Thành viên 4             | [Tên]           | Pending    |

**Trạng thái tài liệu:** Pending Approval

**Nguyên tắc cuối cùng:**

Tất cả thành viên phải phát triển theo cùng một kiến trúc, cùng một quy ước dữ liệu, cùng một tiêu chuẩn mã nguồn và cùng một quy trình tích hợp.

Mục tiêu không chỉ là hoàn thành chức năng riêng lẻ mà là đảm bảo tất cả thành phần có thể kết hợp thành một hệ thống thống nhất, hoạt động ổn định và có thể bàn giao.
