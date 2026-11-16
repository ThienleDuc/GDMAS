# Danh sách Task — Nguyễn Đình Văn (`van`)

Vai trò: Backend Dev 2 (Terminal 1 PostgreSQL/Migrations & Terminal 4 `clustering` chu kỳ 1 ngày/lần — `apps/api/`).
Phạm vi phụ trách: Quản trị thiết kế và tối ưu cơ sở dữ liệu PostgreSQL 16 (Alembic migrations, chỉ mục, quy trình khởi tạo/xóa rỗng cho Demo) và xây dựng thuật toán phân cụm không gian địa chấn DBSCAN chạy độc lập tại Terminal 4.

Lưu ý kiến trúc và quy ước:
- Bắt buộc tuân thủ Bất biến `I4`: **không bao giờ chỉnh sửa trực tiếp file migration cũ** `apps/api/alembic/versions/001_initial_gdmas_schema.py`; mọi bổ sung về bảng, cột hoặc chỉ mục phải tạo revision Alembic mới.
- Terminal 4 (`gdmas.services.clustering.runner`) chạy độc lập theo chu kỳ 1 ngày (`86400` giây), tách biệt hoàn toàn với `main.py` (Bất biến `I1`).
- Mọi tính toán khoảng cách địa lý dùng hệ tọa độ **WGS84** (`latitude`, `longitude`).

---

### Task 1: Xây dựng thuật toán gom cụm mật độ không gian DBSCAN thật cho Terminal 4 (`clustering/runner.py`)

**Mô tả task:**

Hiện tại `apps/api/src/gdmas/services/clustering/runner.py` mới chỉ là một tệp khung 23 dòng (`time.sleep(86400)`), còn phần mô phỏng trong `apps/api/src/gdmas/services/demo_seeder.py` mới chỉ gán nhãn cứng vào 4 cụm cố định bằng phép chia dư `idx % 4`.

Bạn cần xây dựng dịch vụ gom cụm không gian thực sự (tạo module nghiệp vụ mới tại `apps/api/src/gdmas/services/clustering/service.py` và nối vào `runner.py` theo nguyên tắc Open-Closed):

- Truy vấn danh sách sự kiện địa chấn từ bảng `earthquake_events` (hỗ trợ cửa sổ dữ liệu lịch sử cấu hình được, ví dụ 30 ngày hoặc 90 ngày gần nhất, kết hợp lọc độ lớn tối thiểu nếu cần để gom rõ các đới đứt gãy).
- Áp dụng thuật toán `DBSCAN` trong `scikit-learn` (đã có trong `apps/api/pyproject.toml`) trên cặp tọa độ chuẩn **WGS84 (`latitude`, `longitude`)**. Sử dụng độ đo **Haversine** (chuyển đổi độ sang radian qua `np.radians`, quy đổi tham số `eps_km` mặc định 150 km theo `docs/api/API.md` bằng cách chia cho bán kính Trái Đất $6371.0088\text{ km}$, kết hợp `min_samples` mặc định 5) để tính khoảng cách địa lý thực tế thay vì Euclidean phẳng trên độ kinh/vĩ (tránh méo ở vùng vĩ độ cao hoặc ranh giới kinh tuyến $\pm 180^\circ$).
- Với từng cụm hợp lệ (`cluster_label >= 0`), tính toán tọa độ tâm cụm (`center_latitude`, `center_longitude`), bán kính vùng phủ ước lượng theo km, tổng số sự kiện thuộc cụm (`event_count`), độ lớn trung bình (`avg_magnitude`), độ lớn lớn nhất (`max_magnitude`) và tên khu vực đại diện trích từ địa danh nổi bật nhất trong cụm. Đồng thời đếm chính xác số điểm nhiễu ngoại lai (`noise_count` tương ứng nhãn `-1`), và có thể hỗ trợ thêm phương án đối chiếu `K-Means` khi chuẩn hóa đặc trưng tọa độ (`docs/architecture.md` §6.3, `docs/workflow.md` §3.3).

---

### Task 2: Lưu trữ kết quả phân cụm, ánh xạ sự kiện và xử lý chu kỳ chạy Terminal 4

**Mô tả task:**

Sau khi thuật toán DBSCAN chạy xong, kết quả cần được ghi bền vững vào PostgreSQL để Terminal 6 (Database API) đọc và Frontend hiển thị tức thì trên bản đồ cụm:

- Mỗi chu kỳ thực thi của `clustering/runner.py` (mặc định 86400 giây/lần) cần ghi nhận bản ghi `ServiceRun(service_name="clustering")` với các trạng thái `RUNNING` → `SUCCESS` hoặc `FAILED` kèm thời gian UTC (`started_at`, `finished_at`) và số lượng bản ghi xử lý.
- Ghi kết quả tổng hợp vào bảng `clustering_results` gồm `algorithm="DBSCAN"`, `parameters` JSONB (lưu rõ `eps_km`, `min_samples`, `metric="haversine"`), `total_clusters`, `noise_count`, `summary_clusters` JSONB (danh sách chi tiết các cụm khớp với payload của `GET /api/v1/clusters` trong `docs/api/API.md`), và liên kết `service_run_id`.
- Lưu chi tiết mối liên kết từng sự kiện vào bảng `clustering_event_mapping` (`cluster_result_id`, `event_id`, `cluster_label`, trong đó nhãn `-1` biểu diễn điểm nhiễu) bằng `bulk_save_objects` để tối ưu hiệu năng khi dữ liệu lớn.
- Xử lý an toàn các trường hợp biên: khi `earthquake_events` rỗng (Demo Bước 2–3) hoặc có ít hơn `min_samples` sự kiện, worker không được crash hay tạo cụm giả; ghi log phù hợp và kết thúc chu kỳ an toàn. Hỗ trợ cờ `--once` trên `runner.py` để kích hoạt chạy ngay 1 chu kỳ phục vụ Demo Bước 4–5.

---

### Task 3: Quản trị CSDL PostgreSQL 16, bổ sung Alembic Migration tối ưu hiệu năng và kiểm chứng Demo xóa/phục hồi DB

**Mô tả task:**

Hệ thống dựa vào PostgreSQL 16 (Terminal 1) làm nguồn sự thật duy nhất và nơi trao đổi dữ liệu giữa cả 7 Terminals. Hiện repo mới có 1 file migration khởi tạo `001_initial_gdmas_schema.py`.

Bạn cần rà soát và hoàn thiện tầng CSDL theo đúng `docs/architecture/ERD.md` và `docs/yeucaubatbuoc.md`:

- Kiểm tra sự khớp nhau giữa các ORM model trong `apps/api/src/gdmas/models/` (`earthquake.py`, `analysis.py`, `clustering.py`, `prediction.py`, `service_run.py`) với schema trong `001_initial_gdmas_schema.py` và các truy vấn của Backend API.
- Nếu phát hiện thiếu chỉ mục gây chậm (ví dụ index trên `service_runs(service_name, started_at DESC)` để truy vấn nhanh `/api/v1/system/status`, index trên `clustering_results(calculated_at DESC)`, hoặc `clustering_event_mapping(cluster_result_id, cluster_label)`), tạo một revision Alembic **mới** bằng `uv run alembic revision -m "..."` với đầy đủ `upgrade()` và `downgrade()`, tuyệt đối không sửa file migration `001_initial_gdmas_schema.py`.
- Rà soát cấu hình PostgreSQL trong `docker-compose.yml` (Named Volume `gdmas_pgdata`, healthcheck `pg_isready`, biến môi trường khớp `.env.example`) và chuẩn hóa thao tác kiểm thử cho Demo Bước 2 (xóa rỗng dữ liệu các bảng kết quả `analysis_results`, `clustering_results`, `clustering_event_mapping`, `prediction_results`, `classification_results` sạch sẽ, tôn trọng ràng buộc khóa ngoại `CASCADE` / `SET NULL`) cũng như quá trình phục hồi ở Demo Bước 4–5.

---

### Task 4: Viết bộ unit và integration test offline cho Clustering Worker và tầng DB Models/Schema

**Mô tả task:**

Bảo đảm thuật toán gom cụm và cấu trúc lưu trữ hoạt động chính xác trước khi đưa lên môi trường Docker chung:

- Dùng quy trình `write-testcase` để lập đặc tả trong `.agents/notes/testcase/` và tạo mã test offline tại `apps/api/tests/`.
- Tạo tập fixture tọa độ WGS84 mô phỏng 2–3 cụm địa chấn cách xa nhau hàng nghìn km (ví dụ Nhật Bản, California, Indonesia) cùng một số sự kiện đơn lẻ làm nhiễu ngoại lai, kiểm chứng DBSCAN Haversine tách đúng số cụm, tính đúng tâm cụm centroid, `avg_magnitude`, `max_magnitude` và đếm đúng `noise_count`.
- Viết thêm test cho trường hợp dữ liệu vượt qua kinh tuyến $\pm 180^\circ$ (như khu vực Fiji/Tonga quanh kinh độ $179^\circ\text{E}$ và $-179^\circ\text{W}$), trường hợp ít hơn `min_samples` điểm, và trường hợp CSDL rỗng 0 sự kiện.
- Kiểm tra tính toàn vẹn mô hình ORM (quan hệ khóa ngoại tới `service_runs`, ràng buộc unique `(source, source_event_id)`), chạy pass `cd apps/api && uv run pytest` và `uv run ruff check . && uv run ruff format --check .`.

