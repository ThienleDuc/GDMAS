# [ĐẶC TẢ CHỨC NĂNG: MÁY CHỦ REST API & KÊNH SSE REALTIME]

- **Mã chức năng:** FEAT-06
- **Mã định danh (Slug):** `06-api-realtime-sse`
- **Terminal đảm nhiệm:** Terminal 6 - FastAPI REST & SSE Service (`gdmas.main:app`, Port `8000`)
- **Trạng thái:** `In-Progress`
- **Mức độ ưu tiên:** `P0 (Bắt buộc đồ án - Cầu nối trung tâm giữa Data & Web)`
- **Tài liệu tham chiếu:**
  * `docs/yeucaubatbuoc.md` (§1. Database API, Port 8000)
  * `docs/api/API.md` (Toàn bộ danh mục endpoints và schemas)
  * `docs/architecture/SAD.md` (§4.3. API Service)

---

## 1. Mục Tiêu & Bối Cảnh Nghiệp Vụ (Objectives & Scope)

### 1.1. Bài toán giải quyết
Hệ thống GDMAS yêu cầu **Front End không được truy cập trực tiếp vào CSDL** mà bắt buộc phải thông qua tầng Database API. Chức năng này đóng vai trò là "Cổng giao tiếp dữ liệu trung tâm" (Data Gateway):
- Cung cấp toàn bộ các RESTful API endpoints tốc độ cao (FastAPI, Pydantic v2, async).
- Cung cấp kênh truyền phát thời gian thực **Server-Sent Events (SSE)** để tự động đẩy thông báo sự kiện động đất mới nhất xuống trình duyệt mà không cần Frontend phải liên tục gửi request thăm dò (polling).
- Đảm bảo tính nhất quán của dữ liệu: Phục vụ cả 6 patterns phân tích bắt buộc, thông tin gom cụm và danh sách sự kiện địa chấn lọc theo tọa độ, độ lớn, độ sâu.
- Thiết lập CORS an toàn cho phép Web Client (Port `3000`) kết nối trơn tru.

### 1.2. Phạm vi chức năng (Scope Boundaries)
- **Trong phạm vi (In-Scope):**
  * Điểm khởi chạy `apps/api/src/gdmas/main.py` chạy trên cổng `8000`.
  * Các nhóm Router RESTful:
    - `/api/events`: Lấy danh sách sự kiện động đất (phân trang, lọc theo khoảng thời gian, độ lớn, vị trí).
    - `/api/analysis`: Lấy kết quả tính toán 4 patterns chuỗi thời gian đầu tiên.
    - `/api/clustering`: Lấy kết quả gom cụm DBSCAN và chi tiết cụm.
    - `/api/prediction`: Lấy kết quả dự báo định lượng ($t+1$) và nhãn phân loại ($t+1$).
  * Kênh SSE `/api/stream`: Duy trì kết nối streaming HTTP một chiều với Web Client, phát các events: `earthquake_new`, `pipeline_updated`, `system_ping`.
  * Middleware xử lý CORS và logging truy vấn.
- **Ngoài phạm vi (Out-of-Scope):**
  * Không nhúng các tác vụ cào nạp USGS hay phân tích ngầm vào API (vi phạm bất biến I1).
  * Không lưu trữ session hay state người dùng (Stateless API).

---

## 2. Vị Trí Kiến Trúc & Quan Hệ Phụ Thuộc (System Context & Dependencies)

### 2.1. Sơ đồ tương tác (Context Flow)
```mermaid
flowchart TD
    DB[("Terminal 1: PostgreSQL 16<br/>(Port 5432)")] -->|SQLAlchemy Async/Sync Read| API["Terminal 6: FastAPI Server<br/>(Port 8000)"]
    API -->|REST JSON Responses| Web["Terminal 7: React Web Client<br/>(Port 3000)"]
    API -->|SSE Event Stream (text/event-stream)| Web
```

### 2.2. Quan hệ phụ thuộc (Dependencies)
- **Dịch vụ phụ thuộc (Upstream):** CSDL PostgreSQL T1 và các bảng kết quả do T2, T3, T4, T5 nạp vào.
- **Dịch vụ tiêu thụ (Downstream):** Terminal 7 (React Web Client) gọi API và lắng nghe SSE.

---

## 3. Hợp Đồng Dữ Liệu & Danh Mục Endpoints (REST API & SSE Contracts)

### 3.1. Danh mục Endpoints Cốt Lõi

1. **Nhóm Sự kiện Địa chấn (`/api/events`):**
   * `GET /api/events`: Danh sách động đất (Query params: `limit`, `offset`, `min_magnitude`, `start_time`, `end_time`).
   * `GET /api/events/{id}`: Chi tiết một trận động đất.
   * `GET /api/events/stats/summary`: Thống kê nhanh (Tổng số trận, trận lớn nhất 24h qua, độ sâu trung bình).

2. **Nhóm Phân tích 4 Patterns (`/api/analysis`):**
   * `GET /api/analysis/time-distribution`: Trả về dữ liệu 3 biểu đồ Pattern 1 (Line, Scatter, Histogram).
   * `GET /api/analysis/decomposition`: Trả về kết quả phân rã Trend (Pattern 2) và Seasonality (Pattern 3).
   * `GET /api/analysis/correlation`: Trả về ma trận tương quan đa biến Pattern 4 (Heatmap).

3. **Nhóm Gom cụm Không gian (`/api/clustering`):**
   * `GET /api/clustering/latest`: Lấy thông tin kết quả gom cụm DBSCAN mới nhất.
   * `GET /api/clustering/{cluster_id}/events`: Lấy danh sách các sự kiện thuộc một cụm cụ thể.

4. **Nhóm Dự báo & Phân loại (`/api/prediction`):**
   * `GET /api/prediction/latest`: Lấy giá trị dự báo định lượng ngày $t+1$ kèm khoảng tin cậy (Pattern 5).
   * `GET /api/prediction/classification/latest`: Lấy nhãn rủi ro ngày $t+1$ kèm điểm tin cậy (Pattern 6).

5. **Kênh Truyền phát Thời gian thực (`/api/stream`):**
   * `GET /api/stream`: Trả về `text/event-stream`.
   * Cấu trúc Event SSE chuẩn:
     ```text
     event: earthquake_new
     data: {"id": "us7000abcd", "magnitude": 5.2, "place": "Southern California", "event_time": "2026-11-07T23:30:00Z"}

     event: system_ping
     data: {"timestamp": "2026-11-07T23:35:00Z", "status": "healthy"}
     ```

---

## 4. Logic Xử Lý Cốt Lõi & Bất Biến Kiến Trúc

### 4.1. Kiến Trúc Modular Router
Mã nguồn API được tổ chức độc lập theo router riêng biệt tại `apps/api/src/gdmas/api/routes/`:
- `events.py`, `analysis.py`, `clustering.py`, `prediction.py`, `stream.py`.
- Tệp `main.py` chỉ làm nhiệm vụ đăng ký router:
  ```python
  app.include_router(events_router, prefix="/api/events", tags=["Events"])
  app.include_router(analysis_router, prefix="/api/analysis", tags=["Analysis"])
  app.include_router(clustering_router, prefix="/api/clustering", tags=["Clustering"])
  app.include_router(prediction_router, prefix="/api/prediction", tags=["Prediction"])
  app.include_router(stream_router, prefix="/api/stream", tags=["Streaming"])
  ```

### 4.2. Bất Biến Kiến Trúc (Architecture Invariants)
- **Độc lập Terminal (I1):** FastAPI chỉ chạy các API requests và SSE connection. **Tuyệt đối cấm nhúng vòng lặp cào dữ liệu hay chạy worker ML trong `main.py`**.
- **Cổng khởi chạy chuẩn:** Chạy tại port `8000`:
  ```powershell
  uv run uvicorn gdmas.main:app --port 8000 --reload
  ```
- **Chuẩn hóa múi giờ:** Toàn bộ response JSON chứa trường thời gian đều phải có đuôi `Z` (UTC).

---

## 5. Tiêu Chí Nghiệm Thu & Kiểm Thử (Acceptance Criteria)

- [ ] **AC-1:** FastAPI khởi động thành công trên cổng `8000`, truy cập được Swagger UI tại `http://localhost:8000/docs`.
- [ ] **AC-2:** Toàn bộ các endpoints `/api/analysis/*` và `/api/prediction/*` trả về dữ liệu thật từ CSDL, không dùng mock cứng.
- [ ] **AC-3:** Kết nối SSE `http://localhost:8000/api/stream` duy trì kết nối ổn định (Keep-Alive), tự động đẩy dữ liệu khi có sự kiện mới.
- [ ] **AC-4:** Khi CSDL bị xóa dữ liệu, API phản hồi mã lỗi `404` hoặc mảng rỗng `[]` chuẩn hóa, không gây sập máy chủ (`500`).

---

## 6. Kế Hoạch Phân Rã Nhiệm Vụ (Task Breakdown Checklist)

### Pha 1: Cấu hình Khung FastAPI & Middleware
- [x] Khởi tạo ứng dụng FastAPI trong `apps/api/src/gdmas/main.py`.
- [x] Cấu hình CORS Middleware cho phép `http://localhost:3000`.

### Pha 2: Xây Dựng Các Routers REST & SSE
- [x] Xây dựng router `/api/events` và `/api/stream`.
- [ ] Xây dựng router `/api/analysis` phục vụ 4 patterns chuỗi thời gian.
- [ ] Xây dựng router `/api/clustering` phục vụ dữ liệu bản đồ không gian.
- [ ] Xây dựng router `/api/prediction` phục vụ Pattern 5 và 6.

### Pha 3: Kiểm Thử & Nghiệm Thu
- [ ] Viết test tự động cho các endpoints bằng `pytest` và `httpx.AsyncClient`.
- [ ] Thẩm định qua `/source-guard` bảo đảm tuân thủ bất biến I1 và RULE-03.

