# Danh sách Task — Trần Đức Tài (`tai`)

Vai trò: Backend Dev 3 (Terminal 5 `prediction` chu kỳ 5 phút & Terminal 6 Database REST API + Real-time SSE tại cổng `8000` — `apps/api/`).
Phạm vi phụ trách: Động cơ dự báo định lượng & phân loại rủi ro địa chấn ngày kế tiếp $t+1$ (Pattern 5 & Pattern 6) và hoàn thiện tầng FastAPI REST + Real-time SSE làm cổng giao tiếp duy nhất cho Frontend.

Lưu ý kiến trúc và quy ước:
- Tuân thủ Bất biến `I1`: `apps/api/src/gdmas/main.py` chỉ phục vụ HTTP REST và SSE (Terminal 6), tuyệt đối không nhúng vòng lặp worker của Terminal 5 vào `main.py`.
- Tuân thủ nguyên tắc Open-Closed (`RULE-03`): khi mở rộng API mới, thêm router/file mới trong `apps/api/src/gdmas/api/routes/` và gắn vào `api_router`, giữ khả năng tương thích cho các route đã có.
- Mọi timestamp xuất qua JSON/SSE dùng chuẩn **UTC ISO 8601 (`Z`)**; khi DB khả dụng nhưng bị xóa rỗng (Demo Bước 2–3), API phải phản ánh đúng trạng thái rỗng/lỗi thiếu dữ liệu, không che lấp bằng mock tĩnh.

---

### Task 1: Xây dựng động cơ Dự báo định lượng (Pattern 5) và Phân loại rủi ro (Pattern 6) tại Terminal 5 (`prediction/runner.py`)

**Mô tả task:**

Hiện tại `apps/api/src/gdmas/services/prediction/runner.py` mới chỉ là một tệp khung 23 dòng (`time.sleep(300)`), trong khi logic ở `demo_seeder.py` mới nhân thô `recent_daily_rate * 1.08` và xếp hạng đơn giản theo giá trị `magnitude` lớn nhất.

Bạn cần xây dựng dịch vụ dự báo và phân loại thực sự (tạo module tại `apps/api/src/gdmas/services/prediction/service.py` và gọi từ `runner.py` chạy chu kỳ 5 phút/lần, kèm cờ `--once` phục vụ Demo Bước 4–5) dùng `scikit-learn`, `statsmodels`, `pandas`, `numpy`:

- Tổng hợp chuỗi dữ liệu lịch sử theo từng ngày UTC từ `earthquake_events` (số lượng sự kiện mỗi ngày, độ lớn trung bình, độ lớn cực đại, độ sâu trung bình và các đặc trưng trễ lag / rolling window 3 ngày, 7 ngày, 14 ngày).
- **Pattern 5 — Hồi quy và Dự báo định lượng ngày kế tiếp ($t+1$):** Áp dụng mô hình hồi quy chuỗi thời gian (ví dụ `Ridge` Regression với lag features hoặc `ARIMA`/`SARIMAX`) dự báo `predicted_value` cho `target_date` là ngày $t+1$ (`event_count` hoặc `max_magnitude`), kèm cận dưới `lower_bound` và cận trên `upper_bound` của khoảng tin cậy 95% bảo đảm `0 <= lower_bound <= predicted_value <= upper_bound`. Thực hiện chia tập train/test theo đúng **thứ tự thời gian** (không xáo trộn ngẫu nhiên gây rò rỉ dữ liệu tương lai theo `docs/architecture.md` §12.7), đối chiếu với baseline đơn giản (Naive Moving Average), lưu đầy đủ `model_name`, `model_version`, số lượng mẫu đầu vào và các chỉ số `evaluation_metrics` (`mae`, `rmse`, `baseline_mae`) vào bảng `prediction_results`. Đồng thời cập nhật `actual_value` cho bản ghi dự báo của những ngày đã trôi qua để tiện đối chiếu độ chính xác.
- **Pattern 6 — Phân loại mức độ hoạt động địa chấn ($t+1$):** Dùng mô hình phân loại (`RandomForestClassifier` hoặc `LogisticRegression`) gán nhãn mức độ hoạt động cho ngày kế tiếp (`Low Activity`, `Normal Activity`, `High Activity` hoặc thang 4 mức tương ứng với Frontend/API), kèm từ điển `probability_scores` có tổng xác suất bằng `1.0` và chỉ số `evaluation_metrics` (`f1_macro`, `accuracy`), ghi vào bảng `classification_results`.
- Đáp ứng yêu cầu Demo ở `docs/yeucaubatbuoc.md` mục 4: hỗ trợ lưu và tải pre-trained model artifact (nếu có) hoặc thực thi inference gọn nhẹ với dữ liệu đã thu thập để không mất thời gian train lại nặng nề khi Demo; xử lý an toàn khi DB trống hoặc chuỗi lịch sử chưa đủ dài, và ghi đầy đủ `ServiceRun(service_name="prediction")`.

---

### Task 2: Hoàn thiện đầy đủ các Endpoint REST API theo đặc tả `docs/api/API.md` (Terminal 6)

**Mô tả task:**

Hiện tại `apps/api/src/gdmas/api/router.py` mới chỉ đăng ký 4 router (`earthquakes`, `statistics`, `stream`, `patterns`), còn thiếu nhiều endpoint chi tiết đã cam kết trong `docs/api/API.md` mục 3 (khiến Frontend `StatisticsPage.tsx` và `MonitoringMapPage.tsx` chưa lấy được chuỗi số liệu tách biệt cho từng biểu đồ và cụm DBSCAN).

Bạn cần xây dựng các file router/endpoint mới trong `apps/api/src/gdmas/api/routes/` và gắn vào `api_router`:

- **Nhóm Hệ thống (`GET /api/v1/health` và `GET /api/v1/system/status`):** Kiểm tra thực tế kết nối PostgreSQL qua truy vấn nhẹ (`SELECT 1`), đọc bản ghi `ServiceRun` mới nhất cho từng khối (`ingestion`, `analysis`, `clustering`, `prediction`) cùng tổng số sự kiện và thời điểm sự kiện mới nhất trong `earthquake_events` để phục vụ màn hình giám sát 7 Terminals.
- **Nhóm 6 Patterns tách biệt:**
  - `GET /api/v1/analysis/temporal`: đọc kết quả Pattern 1 mới nhất từ `analysis_results`, hỗ trợ lọc `interval` (`day`, `week`, `month`), `start_time`, `end_time`, trả về đầy đủ `line_chart`, `scatter_plot` và `histogram`.
  - `GET /api/v1/analysis/trend`: đọc kết quả Pattern 2 theo `resample_freq` (`W`, `M`) và `metric` (`count`, `avg_magnitude`, `max_magnitude`).
  - `GET /api/v1/analysis/seasonality`: đọc kết quả Pattern 3 (`seasonal_line`, `residual_variance`, `seasonality_strength`, `interpretation`).
  - `GET /api/v1/analysis/correlation`: đọc kết quả Pattern 4 (`variables`, `matrix`, `method: "pearson"`).
  - `GET /api/v1/predictions` và `GET /api/v1/classifications`: trả kết quả dự báo & phân loại $t+1$ mới nhất từ `prediction_results` và `classification_results`.
- **Nhóm Phân cụm (`GET /api/v1/clusters`):** Truy vấn bản ghi `ClusteringResult` mới nhất trả về thuật toán, tham số, `clusters_count`, `noise_count` và mảng chi tiết từng cụm (`cluster_id`, `center_latitude`, `center_longitude`, `event_count`, `avg_magnitude`, `max_magnitude`).
- **Mở rộng bộ lọc `GET /api/v1/earthquakes`:** Bổ sung query parameters `start_time`, `end_time` (ISO 8601 UTC) và bounding box tọa độ `min_lat`, `max_lat`, `min_lon`, `max_lon` như `API.md` §3.2. Chuẩn hóa Envelope phản hồi thành công (`success`, `data`, `metadata`) và phản hồi lỗi (`success: false`, `error: {code, message, details}`) với đúng HTTP status (`400`, `404`, `500`, `503`) theo `API.md` §2 và §4.

---

### Task 3: Chuẩn hóa xử lý DB rỗng cho Demo §4 và đồng bộ kênh Real-time SSE (`routes/events.py`, `stream.py`, `statistics.py`, `earthquakes.py`)

**Mô tả task:**

Kiểm tra thực tế mã nguồn cho thấy hai vấn đề cần xử lý dứt điểm để vượt qua bài kiểm tra Demo Bước 2–3 và đồng bộ tài liệu API:

- Trong `apps/api/src/gdmas/api/routes/earthquakes.py` vẫn tồn tại mảng `MOCK_USGS_DATA` ở fallback khi xảy ra ngoại lệ trong khối `try`, và trong `apps/api/src/gdmas/api/routes/statistics.py` vẫn còn khối fallback trả `total_events=1248` cùng `default_time_series` giả lập. Cần tách bạch rõ: khi kết nối DB thất bại thật, API phải trả lỗi `DATABASE_ERROR` (HTTP 500) hoặc trạng thái dịch vụ không sẵn sàng thay vì âm thầm trả dữ liệu giả 1248 bản ghi; còn khi DB hoạt động nhưng các bảng đã bị xóa trống (Demo Bước 2–3), tất cả các endpoint `/earthquakes`, `/statistics/earthquakes`, `/patterns`, `/analysis/*`, `/predictions`, `/classifications`, `/clusters` đều phải trả dữ liệu rỗng thật (0 bản ghi / `success: false` kèm thông điệp hoặc danh sách rỗng theo contract) để Frontend hiển thị chính xác Empty State.
- Hiện tại `apps/api/src/gdmas/api/routes/events.py` đang là file rỗng (0 byte), trong khi `API.md` §3.5 định nghĩa endpoint SSE là `GET /api/v1/events/stream`, còn `stream.py` đang chạy trên `/api/v1/stream/earthquakes`. Cần hoàn thiện `routes/events.py` (chia sẻ generator/manager từ `gdmas/realtime/sse.py` và `stream.py`, tránh trùng lặp code) để phục vụ cả endpoint chuẩn `/api/v1/events/stream` lẫn đường dẫn đang dùng `/api/v1/stream/earthquakes`, bảo đảm phát đúng schema tại `contracts/schemas/sse-event.json` cho các sự kiện `earthquake_detected` / `earthquake_alert` (ưu tiên cảnh báo khi $M \ge 4.5$ theo `docs/workflow.md` §3.5), `ingestion_cycle_completed`, `database_cleared` và `heartbeat`.

---

### Task 4: Viết bộ unit và integration test offline cho Prediction Worker và toàn bộ FastAPI REST/SSE

**Mô tả task:**

Bảo đảm độ tin cậy của tầng ML dự báo và hợp đồng API trước khi Frontend tích hợp:

- Dùng quy trình `write-testcase` để tạo tài liệu testcase trong `.agents/notes/testcase/` và bổ sung bộ kiểm thử tự động offline tại `apps/api/tests/`.
- Đối với **Prediction & Classification (Terminal 5)**: kiểm chứng tính hợp lệ toán học trên chuỗi ngày giả lập UTC (`lower_bound <= predicted_value <= upper_bound`, xác suất các nhãn phân loại không âm và tổng bằng `1.0`), kiểm tra xử lý an toàn khi dữ liệu lịch sử thưa hoặc có 0 bản ghi trong DB, và kiểm tra cơ chế cập nhật `actual_value` / ghi `ServiceRun`.
- Đối với **Database API & SSE (Terminal 6)**: dùng FastAPI `TestClient` kết hợp dependency override / mock session DB để kiểm thử mọi endpoint mới và cũ (`200 OK`, `400 VALIDATION_ERROR` khi `min_magnitude > max_magnitude`, `404 RESOURCE_NOT_FOUND`, `500 DATABASE_ERROR` khi mất kết nối DB và không fallback trả mock tĩnh `1248`, phản hồi rỗng hợp lệ khi DB trống theo Demo §4, format dữ liệu luồng SSE `text/event-stream`).
- Chạy xác nhận đạt chuẩn `cd apps/api && uv run pytest` và `uv run ruff check . && uv run ruff format --check .`.

