# Coding Rules — 7 Bất Biến Cứng của GDMAS (I1–I7)

Bản đầy đủ các bất biến kiến trúc được tóm tắt trong [AGENTS.md](../AGENTS.md) và hiến chương [quyuocchung.md](quyuocchung.md).
Mỗi bất biến kèm **dấu hiệu vi phạm** để skill `project-review` rà soát trực tiếp trong diff.
Muốn thay đổi một bất biến bắt buộc phải có proposal ghi `Overrides` và được kiểm tra đồng bộ, không xung đột trước khi merge.

---

## I1. Tách biệt 7 Terminals độc lập (7 Terminals Separation)

Mô hình vận hành của GDMAS gồm 7 khối chạy độc lập tại 7 terminal:
PostgreSQL (T1), Ingestion 5m (T2), Analysis 5m (T3), Clustering 1d (T4), Prediction 5m (T5), FastAPI REST + SSE (T6), React Web (T7).
`apps/api/src/gdmas/main.py` chỉ phục vụ REST API và SSE.

**Dấu hiệu vi phạm (`CRITICAL BUG`):**
- Nhúng vòng lặp nền (`while True`, `APScheduler`, `asyncio.create_task` chạy worker ingestion/analysis/clustering/prediction) vào `apps/api/src/gdmas/main.py`.
- Một worker phụ thuộc vòng đời HTTP server của API mới chạy được, thay vì có `runner.py` độc lập trong `apps/api/src/gdmas/services/<service>/runner.py`.

---

## I2. Nguyên tắc Open-Closed (`RULE-03`)

Đóng với việc sửa đổi phá vỡ mã nguồn đang chạy ổn định, mở với việc bổ sung mới.

**Dấu hiệu vi phạm:**
- Xóa tệp mã nguồn, test hoặc tài liệu đang tồn tại trong repo (`git status: D`) khi không có chỉ thị rõ ràng.
- Thay đổi tên hàm, tham số bắt buộc hoặc kiểu trả về của hàm/router đang được module khác gọi (breaking signature).
- Sửa đổi logic lõi của phân hệ thuộc thành viên khác ngoài `In Scope` trong `plan.md`.
- *Cách làm đúng:* bổ sung file route mới, component mới, runner mới, hàm `_v2` hoặc tham số mặc định tương thích ngược.

---

## I3. Chuẩn hóa Hợp đồng dữ liệu, Múi giờ UTC & Hệ tọa độ WGS84

Mọi trao đổi giữa Backend (`apps/api`) và Frontend (`apps/web`) phải khớp schema trong `contracts/schemas/` và `docs/api/API.md`.

**Dấu hiệu vi phạm:**
- Lưu hoặc trả về timestamp dạng local time (UTC+7) không có timezone hoặc thiếu chuẩn UTC ISO 8601 (`TIMESTAMPTZ` trong DB, `timezone.utc` trong Python, hậu tố `Z` / `+00:00` trên JSON). Quy đổi sang giờ địa phương chỉ thực hiện ở tầng hiển thị Frontend (`apps/web/src/utils/timezone.ts`).
- Dùng hệ tọa độ khác WGS84 (`latitude` [-90..90], `longitude` [-180..180]) hoặc đảo thứ tự lat/lon mà không khớp GeoJSON/contract.
- Đổi cấu trúc JSON envelope `{success, data, metadata}` / `{success, error}` hoặc đổi field API mà không cập nhật `contracts/` & `docs/api/API.md`.

---

## I4. Bất biến Alembic Migration

Lịch sử migration Alembic là nguồn sự thật tuần tự cho schema PostgreSQL.

**Dấu hiệu vi phạm (`CRITICAL BUG`):**
- Chỉnh sửa nội dung hoặc xóa file migration đã tồn tại trong `apps/api/alembic/versions/` (ví dụ `001_initial_gdmas_schema.py`).
- Đổi schema bảng trong ORM models (`apps/api/src/gdmas/models/`) mà không tạo migration mới qua `uv run alembic revision --autogenerate`.

---

## I5. Đáp ứng 6 Patterns Chuỗi Thời Gian & Giao diện Dark Mode

6 Patterns bắt buộc: (1) Biểu diễn theo thời gian (Line, Scatter, Histogram theo Ngày/Tuần/Tháng), (2) Trend Analysis sau Re-sampling, (3) Seasonality sau Re-sampling, (4) Ma trận tương quan Correlation Heatmap, (5) Dự báo định lượng $t+1$ kèm khoảng tin cậy 95%, (6) Phân loại mức rủi ro $t+1$.

**Dấu hiệu vi phạm:**
- Hardcode dữ liệu giả tĩnh thay thế lời gọi API Backend trong các view sản phẩm (vi phạm điều kiện Demo §4 trong `docs/yeucaubatbuoc.md`).
- Dùng kiểu `any` tùy tiện trong TypeScript hoặc gọi `fetch` rải rác trong component UI thay vì đi qua `apps/web/src/services/`.
- Thiếu xử lý Loading / Error / Empty state khi DB trống (sẽ hỏng kịch bản Demo §4).
- Đặt nhầm component biểu đồ mới đè lên component cũ thay vì tách file mới trong `apps/web/src/components/charts/`.

---

## I6. Bảo mật, Secrets & Biến môi trường

Thông tin nhạy cảm (`DATABASE_URL` có mật khẩu thật, API keys, tokens) chỉ nằm trong `.env` cục bộ (gitignored).

**Dấu hiệu vi phạm (`CRITICAL BUG`):**
- Stage hoặc commit `.env`, `.env.local`, `apps/api/.env`, `apps/web/.env`, khóa `.pem`/`.key`, `.agents/me`, `.artifacts/`.
- Hardcode password, token, secret key thật trong mã nguồn, test, workflow hoặc notes.
- In token / credential / chuỗi kết nối chứa mật khẩu ra `logger` hoặc HTTP error response.

---

## I7. Toàn vẹn bộ kiểm thử, Môi trường Offline & Bắt buộc tạo file test

Bộ kiểm thử (unit / integration / UI) bảo vệ hệ thống khỏi regression bugs. Mọi task có thay đổi mã nguồn/logic sau khi implement xong bắt buộc phải để lại dấu vết kiểm thử tái lập được.

**Dấu hiệu vi phạm:**
- Xóa, skip vô cớ hoặc sửa assertion của test case cũ đang pass để che giấu lỗi mới phát sinh.
- Unit test gọi trực tiếp mạng thật (`earthquake.usgs.gov`) hoặc dịch vụ ngoài không có mock / cờ opt-in riêng, làm test fail khi chạy offline.
- Hoàn thành code/logic/API/UI mới nhưng **không tạo file test tự động** (`apps/api/tests/.../test_*.py`, `scripts/tests/test_*.py` hoặc FE test) **và không tạo tài liệu kiểm thử từ [`.agents/notes/testcase/_TEMPLATE.md`](../.agents/notes/testcase/_TEMPLATE.md)**.
- Kiểm thử riêng 1 file (`test/<id>`) phát hiện lỗi nhưng không ghi nhận vào [`.agents/notes/bugs/`](../.agents/notes/bugs/_TEMPLATE.md).

