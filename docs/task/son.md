# Danh sách Task — Lê Trung Sơn (`son`)

Vai trò: Backend Dev 1 (Terminal 2 `ingestion` chu kỳ 5 phút & Terminal 3 `analysis` chu kỳ 5 phút — `apps/api/src/gdmas/services/`).
Phạm vi phụ trách: Đường ống thu thập dữ liệu địa chấn từ USGS và toàn bộ động cơ phân tích chuỗi thời gian tính toán 4 Patterns đầu tiên (Temporal, Trend, Seasonality, Correlation) lưu vào bảng `analysis_results`.

## Tiến độ cập nhật ngày 2026-11-13

| Task | Trạng thái thực tế | Bằng chứng / phần còn lại |
|---|---|---|
| 1 — Ingestion | Hoàn tất, đã merge | PR #4 và #5; upsert, kiểm tra dữ liệu, fallback, 77 unit test offline |
| 2 — Động cơ 4 Patterns | Hoàn tất, đã merge PR #6 | Temporal/Trend/Seasonality/Correlation từ dữ liệu thật, có test hồi quy cho kỳ dở dang |
| 3 — Snapshot, nhật ký, Demo | Hoàn tất, đã merge PR #6 | `--once`, ServiceRun, snapshot nguyên tử, rollback giữ kết quả cũ, DB rỗng/phục hồi có test tích hợp |
| 4 — Kiểm thử | 126 test offline đạt; còn lint/format nền toàn backend | 121 unit + 5 integration; lint/format sạch trên tệp thay đổi. Toàn backend còn 172 lỗi lint và 28 tệp cần format ngoài diff, cần phạm vi xử lý riêng |

Các phần mô tả bên dưới giữ bối cảnh gốc của task; tra trạng thái hiện tại ở bảng trên và `.agents/notes/implemented/`.

Lưu ý kiến trúc và quy ước:
- Terminal 2 (`gdmas.services.ingestion.runner`) và Terminal 3 (`gdmas.services.analysis.runner`) phải chạy hoàn toàn độc lập với máy chủ FastAPI (`main.py`), tuân thủ Bất biến `I1` (Tách biệt 7 Terminals).
- Tuân thủ nguyên tắc Open-Closed (`RULE-03`): giữ nguyên giao diện lệnh `python -m gdmas.services.<tên>.runner`, tách phần xử lý nghiệp vụ mới vào các hàm/file dịch vụ rõ ràng.
- Mọi mốc thời gian sử dụng **UTC (`TIMESTAMPTZ`)** và tọa độ dùng chuẩn **WGS84** (`latitude`, `longitude`).

---

### Task 1: Chuẩn hóa cơ chế Upsert thực thụ và kiểm tra dữ liệu đầu vào cho Data Ingestion Service

**Mô tả task:**

Hiện tại `apps/api/src/gdmas/services/ingestion/runner.py` và `service.py` đã vận hành được chu kỳ quét 5 phút từ USGS (`all_hour.geojson` kèm fallback `all_day.geojson`) và ghi log vào `service_runs`. Tuy nhiên phương thức `_save_feature_if_new` trong `service.py` hiện mới chỉ kiểm tra tồn tại theo `source_event_id` rồi bỏ qua (`return False`), chưa thực hiện đúng chiến lược Upsert được đặc tả trong `docs/architecture/ERD.md` mục 4 và `docs/architecture/SAD.md` mục 4.2.

Bạn cần hoàn thiện khối Ingestion với các yêu cầu cụ thể sau:

- Nâng cấp logic lưu sự kiện trong `apps/api/src/gdmas/services/ingestion/service.py` sang cơ chế Upsert chuẩn trên ràng buộc kép `UNIQUE (source, source_event_id)` (bằng `sqlalchemy.dialects.postgresql.insert(...).on_conflict_do_update(...)` hoặc xử lý cập nhật tương đương an toàn với session). Khi USGS hiệu chỉnh lại độ lớn `magnitude`, độ sâu `depth_km`, tọa độ hoặc mô tả `place` (tức `source_updated_at` từ nguồn mới hơn giá trị đang lưu hoặc bản ghi cũ chưa có `source_updated_at`), hệ thống phải cập nhật lại bản ghi hiện có thay vì bỏ qua.
- Bổ sung bước kiểm tra tính hợp lệ dữ liệu GeoJSON trước khi lưu: loại bỏ hoặc ghi cảnh báo với bản ghi thiếu tọa độ hoặc có `latitude` ngoài khoảng `-90.0` đến `90.0`, `longitude` ngoài khoảng `-180.0` đến `180.0`, hoặc `magnitude` không phải số hợp lệ (`NaN`/`None`). Đảm bảo mọi timestamp (`event_time`, `source_updated_at`, `ingested_at`) đều mang `timezone.utc`.
- Đảm bảo tính chịu lỗi cao khi USGS API timeout, trả lỗi HTTP 5xx hoặc mất Internet: ghi nhận `ServiceRun` với `status="FAILED"`, lưu thông báo lỗi ngắn gọn không chứa thông tin nhạy cảm, đóng session sạch sẽ và giữ worker tiếp tục chờ chu kỳ 5 phút kế tiếp mà không crash tiến trình.

---

### Task 2: Xây dựng động cơ phân tích 4 Patterns chuỗi thời gian thật cho Terminal 3 (`analysis/runner.py`)

**Mô tả task:**

Hiện tại `apps/api/src/gdmas/services/analysis/runner.py` mới chỉ là một tệp khung 23 dòng chứa `time.sleep(300)` chưa có logic tính toán. Phần tính tạm trong `apps/api/src/gdmas/services/demo_seeder.py` hiện đang tính đơn giản và thậm chí hardcode tĩnh dữ liệu cho Pattern 3 (`season_points`) và Pattern 4 (`corr_matrix`).

Bạn cần xây dựng service phân tích thật (ví dụ tạo `apps/api/src/gdmas/services/analysis/service.py` và gọi từ `runner.py`) sử dụng các thư viện khoa học dữ liệu đã có sẵn trong `apps/api/pyproject.toml` (`pandas`, `numpy`, `scipy`, `statsmodels`) để tính toán đủ 4 Patterns từ dữ liệu thật trong bảng `earthquake_events`:

- **Pattern 1 — Biểu diễn theo thời gian (Temporal):** Tạo dữ liệu cho đủ 3 dạng biểu đồ theo 3 mức thời gian `day`, `week` và `month` (khớp cấu trúc `GET /api/v1/analysis/temporal` trong `docs/api/API.md`): chuỗi `line_chart` (`date`, `event_count`, `max_magnitude`, `avg_magnitude`), tập điểm `scatter_plot` (`id`, `timestamp` chuẩn ISO UTC `Z`, `magnitude`, `depth_km`) và phân phối tần suất `histogram` theo các khoảng `magnitude` (`<2.0`, `2.0-3.0`, `3.0-4.0`, `4.0-5.0`, `>=5.0` hoặc chuẩn bảng bin thống nhất với Backend API).
- **Pattern 2 — Phân tích xu hướng sau Re-sampling (Trend Analysis):** Gom nhóm chuỗi sự kiện bằng Re-sampling theo Tháng (`1ME`) và Tuần (`1W`); khi dữ liệu lịch sử mới nạp ít hơn 7 ngày, tự động fallback sang đơn vị Tuần/Ngày để tránh lỗi `Not enough data points` (`docs/workflow.md` §7). Áp dụng Moving Average hoặc `seasonal_decompose` để tách đường `trend_value` so sánh với `actual_value`, tính hệ số góc `slope` (qua hồi quy tuyến tính) và xác định chiều hướng `trend_direction` (`increasing`, `decreasing`, `stable`).
- **Pattern 3 — Phân tích chu kỳ mùa vụ sau Re-sampling (Seasonality):** Trích xuất thành phần mùa vụ thật (`seasonal_line`, `cycle_index`, `period_label`, `seasonal_factor`, `residual_variance`, `seasonality_strength` và câu diễn giải tự động) từ chuỗi dữ liệu đã Re-sampling, loại bỏ hoàn toàn số liệu giả lập hardcode. Tuân thủ `docs/architecture.md` mục P-03: không mặc định dữ liệu động đất có mùa vụ rõ — nếu chuỗi chưa đủ chu kỳ hoặc không có tính mùa vụ ổn định, trả kết luận khách quan ("Chu kỳ yếu / chưa xác định mùa vụ rõ").
- **Pattern 4 — Ma trận tương quan đa biến (Correlation Heatmap):** Tính ma trận tương quan Pearson thực tế (chống chia cho 0 / `NaN` khi phương sai bằng 0) giữa 5 biến định lượng gồm `magnitude`, `depth_km`, `latitude`, `longitude` và `daily_event_count` (tổng hợp số sự kiện theo ngày UTC gắn về từng sự kiện), có thể hỗ trợ thêm Spearman khi cần và ghi chú không suy diễn tương quan thành quan hệ nhân quả.

---

### Task 3: Lưu trữ `analysis_results`, ghi nhật ký `service_runs` và hỗ trợ chạy Demo phục hồi dữ liệu

**Mô tả task:**

Để Terminal 6 (Database API) phục vụ nhanh dưới 100ms và đáp ứng đúng Kịch bản Demo 6 bước (`docs/yeucaubatbuoc.md` mục 4), luồng chạy của Terminal 3 cần quản lý chặt chẽ việc lưu kết quả vào PostgreSQL và xử lý khi DB rỗng:

- Trong mỗi chu kỳ 5 phút của `analysis/runner.py`, khởi tạo bản ghi `ServiceRun(service_name="analysis", status="RUNNING")`, thực thi tính toán Patterns 1–4, lưu các bản ghi kết quả vào bảng `analysis_results` kèm `service_run_id`, `period_start`, `period_end`, `calculated_at` (UTC) và `metrics_data` JSONB, rồi cập nhật `ServiceRun` sang `SUCCESS` cùng `records_processed`.
- Thống nhất chuẩn giá trị `analysis_type` và `time_interval` khi ghi `analysis_results` sao cho tương thích đồng thời với truy vấn mới theo `docs/api/API.md` (`temporal`, `trend`, `seasonality`, `correlation`) và không làm hỏng endpoint `/api/v1/patterns` hiện tại (hoặc phối hợp với `tai` cập nhật ánh xạ tương ứng).
- Xử lý an toàn trạng thái DB rỗng (Demo Bước 2–3) hoặc dữ liệu quá thưa: khi `earthquake_events` có 0 bản ghi (hoặc quá ít điểm để phân tích mùa vụ), tuyệt đối không chèn số liệu giả; worker xóa hoặc không ghi kết quả ảo, cập nhật trạng thái run rõ ràng và tự tính lại đầy đủ ngay khi dữ liệu thô xuất hiện trở lại.
- Bổ sung tham số CLI `--once` (hoặc hàm `execute_cycle()`) cho `apps/api/src/gdmas/services/analysis/runner.py` để khi người dùng hoặc giảng viên kiểm tra Demo Bước 4–5 có thể kích hoạt chạy ngay 1 chu kỳ phân tích mà không phải đợi hết 5 phút ngủ.

---

### Task 4: Viết bộ unit và integration test offline cho Ingestion & Analysis Workers

**Mô tả task:**

Bảo đảm chất lượng và tuân thủ Bất biến `I7` (mọi test chạy offline 100%, không gọi mạng USGS thật khi chạy pytest):

- Dùng quy trình `write-testcase` để tạo đặc tả kiểm thử trong `.agents/notes/testcase/` và viết các file test tự động trong `apps/api/tests/unit/`.
- Đối với **Ingestion**: giả lập GeoJSON response bằng mock `httpx` để kiểm chứng trường hợp nạp mới sự kiện, trường hợp Upsert cập nhật khi `source_updated_at` mới hơn, trường hợp bỏ qua bản ghi trùng cũ, trường hợp lỗi HTTP 503/timeout ghi `ServiceRun` trạng thái `FAILED`, và trường hợp tọa độ WGS84 hoặc timestamp không hợp lệ.
- Đối với **Analysis (Patterns 1–4)**: tạo fixture tập sự kiện chuỗi thời gian trải dài nhiều tuần (timestamp UTC `Z`) để kiểm chứng kết quả Line/Scatter/Histogram, Re-sampling `1W`/`1ME`, giá trị `slope`/`trend_direction`, thành phần mùa vụ và tính đối xứng/giá trị trong đoạn $[-1, 1]$ của ma trận tương quan Pearson; kiểm thử thêm trường hợp biên DB có 0 bản ghi và 1 bản ghi không được phát sinh ngoại lệ `ZeroDivisionError` hay `NaN` không hợp lệ trong JSON.
- Chạy xác nhận xanh toàn bộ lệnh `cd apps/api && uv run pytest` và `uv run ruff check . && uv run ruff format --check .`.

