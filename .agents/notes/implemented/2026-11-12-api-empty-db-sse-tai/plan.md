# Implementation Plan: Loại bỏ dữ liệu giả, xử lý DB rỗng/DB lỗi, sửa SSE (Terminal 6)

## Metadata
- ID: 2026-11-12-api-empty-db-sse-tai
- Proposal: .agents/notes/proposed/2026-11-12-api-empty-db-sse-tai.md
- Approved By: tai
- Approved At: 2026-11-14
- Implementer: agent | tai
- Status: completed

---

## 1. Mục tiêu
Xóa toàn bộ dữ liệu giả khỏi `/earthquakes*` và `/statistics/earthquakes`; phân biệt DB lỗi (500 `DATABASE_ERROR`) và DB rỗng (200 dữ liệu rỗng thật); sửa lỗi thụt lề SSE để phát đủ sự kiện; thêm `/events/stream`; thêm `connect_timeout` để mất DB không treo request.

---

## 2. Phạm vi
### In Scope
- `apps/api/src/gdmas/api/errors.py` *(mới)*
- `apps/api/src/gdmas/api/routes/earthquakes.py` *(sửa: xóa mock)*
- `apps/api/src/gdmas/api/routes/statistics.py` *(sửa: xóa 1248, tính từ DB)*
- `apps/api/src/gdmas/api/routes/stream.py` *(sửa: thu gọn)*
- `apps/api/src/gdmas/api/routes/events.py` *(mới)*
- `apps/api/src/gdmas/api/router.py` *(sửa: thêm events.router)*
- `apps/api/src/gdmas/realtime/sse.py` *(mới: generator dùng chung)*
- `apps/api/src/gdmas/db/connection.py` *(sửa: thêm connect_timeout)*
- `contracts/schemas/sse-event.json` *(bổ sung enum)*
- `.agents/notes/testcase/2026-11-12-api-empty-db-sse-tai.md`
- `apps/api/tests/unit/conftest.py`, `test_earthquakes_routes.py`, `test_statistics_route.py`, `test_sse_stream.py`
### Out of Scope
- `/health`, `/system/status`, `/analysis/*`, `/predictions`, `/classifications`, `/clusters`, bộ lọc mới `/earthquakes` (Task 2).
- `main.py`, `base.py`, model ORM, migration, `apps/web/`.
- Đổi cấu trúc phản hồi `/statistics/earthquakes` cho khớp `API.md` §3.2.

---

## 3. Các bước
### Step 1 — Envelope lỗi
`errors.py`: `error_response(code, message, status_code, details=None)` trả `JSONResponse` theo `API.md` §2.

### Step 2 — Sửa earthquakes.py
Xóa `MOCK_USGS_DATA` và ba nhánh fallback. `GET /earthquakes` bắt `SQLAlchemyError` → 500 `DATABASE_ERROR`; DB rỗng → 200 `data: []`, `total: 0`. `GET /earthquakes/{id}` không tìm thấy → 404 `RESOURCE_NOT_FOUND`. `POST /sync`: USGS không truy cập được → 503 `DATA_SOURCE_UNAVAILABLE`; lỗi ghi DB → rollback + 500.

### Step 3 — Sửa statistics.py
Xóa `default_time_series` và fallback 1248. `time_series_preview` tính từ DB: 8 khoảng 3 giờ trong 24 giờ gần nhất (UTC), mỗi điểm `{time: HH:MM, count, avg_mag}`. DB rỗng → `[]`; có sự kiện ngoài 24 giờ → vẫn 8 điểm `count = 0`. DB lỗi → 500.

### Step 4 — Generator SSE dùng chung
`realtime/sse.py`: `_connected_sse_queues`, `broadcast_database_cleared_event`, `get_latest_state`, `earthquake_event_generator`. Sửa thụt lề để các khối phát event **nằm trong `while True`**. Khi `get_latest_state` trả `success: False` thì giữ trạng thái cũ, bỏ qua chu kỳ (không phát `database_cleared`). Phát `earthquake_alert` cho M ≥ 4.5 (song song với `earthquake_detected`/`ingestion_cycle_completed`). Timestamp UTC có `Z`.

### Step 5 — Route mỏng
`stream.py`: giữ `/stream/earthquakes` và `/stream/broadcast-cleared`, gọi generator chung. `events.py`: `GET /events/stream` gọi cùng generator. `router.py`: include `events.router`.

### Step 6 — connect_timeout
`db/connection.py`: thêm `connect_args={"connect_timeout": 3}` vào `create_engine` để mất DB → lỗi sau ~3 giây thay vì treo.

### Step 7 — Contract enum
`contracts/schemas/sse-event.json`: bổ sung `earthquake_alert`, `ingestion_cycle_completed`, `database_cleared` vào enum. Chỉ sửa đúng dòng enum để diff gọn.

### Step 8 — Test offline
`conftest.py` (SQLite trong bộ nhớ + `BrokenSession`), `test_earthquakes_routes.py` (29), `test_statistics_route.py` (6), `test_sse_stream.py` (11).

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có Alembic migration. Đổi phản hồi lỗi `/earthquakes` sang Envelope `API.md` §2 (Frontend cần rà). Thêm route `/api/v1/events/stream`. `connection.py` thêm `connect_timeout=3`. `contracts/schemas/sse-event.json` bổ sung enum.

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] **Đã tạo đặc tả testcase** tại `.agents/notes/testcase/2026-11-12-api-empty-db-sse-tai.md`
- [x] **Đã tạo và chạy pass file unit test offline** (`conftest.py`, `test_earthquakes_routes.py`, `test_statistics_route.py`, `test_sse_stream.py`)
- [x] Backend test liên quan: `uv run pytest tests/unit -q` → 123 passed
- [x] Backend lint/format: `ruff check tests/unit` đạt; `ruff format --check tests/unit` 7 files already formatted
- [ ] Frontend typecheck & build: N/A (không đụng `apps/web`, nhưng cần rà `earthquake-api.ts`, `useSSE.ts` trước merge)
- [ ] Notes check (`notes_index.py --check`): chạy khi hoàn tất bộ tài liệu
- [x] Tài liệu bị ảnh hưởng: `contracts/schemas/sse-event.json` đã cập nhật; `API.md` §3.5 cần đối chiếu (drift)
- [x] Kiểm chứng chức năng: SSE trước sửa chỉ 1 heartbeat rồi im lặng; sau sửa heartbeat ~2 giây; `/statistics/earthquakes` trả 185 sự kiện thật; `/earthquakes/99999999` 404; tắt Postgres → 500 `DATABASE_ERROR` sau ~3 giây

---

## 6. Rủi ro khi làm
- Frontend có thể đang đọc `detail` của 404 cũ → rà `earthquake-api.ts`.
- Frontend có thể quen nhận 200 (mock) khi DB lỗi → báo `thien`.
- `connect_timeout` ảnh hưởng mọi kết nối DB kể cả worker → 3 giây đủ cho local/Docker.

---

## 7. Rollback
Revert PR nhánh `fix/api-empty-db-sse`. Không có migration. Nếu cần demo gấp, có thể tạm khôi phục mock bằng revert riêng `earthquakes.py`/`statistics.py`, nhưng sẽ hỏng Demo Bước 1 ("không dùng mock tĩnh").

---

## 8. Ghi chú
- `contracts/` là vùng dùng chung — ghi tên `thien` trong mô tả PR.
- `connection.py` là tệp dùng chung — báo `thien` trước merge.
- `B008` ở các tệp route là quy tắc chung của repo; đề xuất nhóm thêm `extend-immutable-calls` cho `Depends`/`Query`.