# Proposal: Loại bỏ dữ liệu giả khỏi API, xử lý đúng DB rỗng / DB lỗi và sửa kênh Real-time SSE (Terminal 6)

## Metadata
- ID: 2026-11-12-api-empty-db-sse-tai
- Author: agent | tai
- Created: 2026-11-12
- Type: bugfix
- Status: approved
- Priority: high
- Area: apps/api/src/gdmas/api/routes/ (earthquakes.py, statistics.py, stream.py, events.py), apps/api/src/gdmas/api/router.py, apps/api/src/gdmas/realtime/sse.py, apps/api/src/gdmas/api/errors.py, apps/api/src/gdmas/db/connection.py, contracts/schemas/sse-event.json
- Architecture Impact: contracts/, docs/api/API.md
  <!-- - contracts/schemas/sse-event.json: enum `event` hiện chỉ có `earthquake_detected`, `heartbeat`, `alert`;
         sẽ thêm (chỉ bổ sung) `ingestion_cycle_completed`, `database_cleared`, `earthquake_alert`.
       - docs/api/API.md §3.5: ví dụ SSE ghi `earthquake_alert` với data phẳng; thực tế gói tin có dạng
         {event, data, timestamp}. Cần cập nhật ví dụ cho khớp.
       - Ghi nhận drift, KHÔNG xử lý trong proposal này: API.md §3.2 mô tả `/statistics/earthquakes` dạng
         summary_24h / summary_7d / magnitude_distribution, trong khi code và Frontend dùng total_events,
         strong_events_count... -->
- Related Docs:
  - docs/quyuocchung.md
  - docs/coding-rules.md (I1, I2, I3, I7)
  - docs/task/tai.md (Task 3)
  - docs/yeucaubatbuoc.md (§4 Demo Bước 1–3)
  - docs/api/API.md (§2 Envelope, §3.5 SSE, §4 Mã lỗi)
  - docs/workflow.md (§3.5 Serving Pipeline, cảnh báo M ≥ 4.5)
- Related Proposals:
  - .agents/notes/proposed/2026-11-12-seismic-prediction-worker-tai.md (độc lập; cùng tác giả)
  - .agents/notes/proposed/2026-11-12-api-rest-endpoints-tai.md (Task 2; dùng chung errors.py, earthquakes.py, router.py)
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Terminal 6 (Database API + SSE, cổng 8000) là cổng giao tiếp duy nhất của Frontend. Kịch bản Demo §4 yêu cầu: Bước 1 chứng minh dữ liệu đến từ Backend (**không dùng mock tĩnh**); Bước 2–3 xóa dữ liệu trong DB thì Web phải hiển thị đúng trạng thái rỗng hoặc lỗi.

### Vấn đề
Khảo sát mã nguồn trên `develop` cho thấy:
1. **`earthquakes.py`:** `GET /earthquakes` bắt mọi ngoại lệ bằng `except Exception: pass` rồi trả `MOCK_USGS_DATA` (10 bản ghi giả); `GET /earthquakes/{id}` cũng tra mock; `POST /earthquakes/sync` ghi vào mảng mock trong bộ nhớ và vẫn báo thành công khi USGS không truy cập được.
2. **`statistics.py`:** khi DB lỗi thì trả `total_events=1248` giả. Nghiêm trọng hơn, **ngay cả khi DB có dữ liệu thật**, `time_series_preview` vẫn là 8 điểm cố định viết cứng trong code, không tính từ DB.
3. **`stream.py` (SSE):**
   - Các khối phát `ingestion_cycle_completed`, `earthquake_detected` và `heartbeat` định kỳ đang **nằm ngoài vòng `while True`** do sai thụt lề (phân tích cú pháp AST: vòng `while` ở dòng 189 kết thúc ở dòng 249, các khối `if new_run_info` / `elif new_events` / `if not new_run_info...` ở dòng 252 / 281 / 301 cùng cấp với `while`). Vòng lặp chỉ thoát khi client ngắt kết nối, nên các khối này gần như không bao giờ chạy; nếu client ngắt sớm còn có thể gây `UnboundLocalError`. Frontend (`useSSE.ts`, `DashboardLayout.tsx`) đang chờ đúng các event này.
   - `get_latest_state()` khi lỗi DB trả `total: 0`, generator có thể hiểu nhầm là "CSDL bị xóa" và phát `database_cleared` giả.
   - Chỉ có `/api/v1/stream/earthquakes`, chưa có `/api/v1/events/stream` như `API.md` §3.5.
4. `routes/events.py`, `realtime/sse.py`, `realtime/event_manager.py` đều là tệp rỗng.
5. `contracts/schemas/sse-event.json` chưa liệt kê hết các event thực tế.
6. **Mất kết nối DB làm request treo vô hạn (phát hiện khi chạy thật ngày 2026-11-12):**
   `create_engine` trong `connection.py` không đặt thời gian chờ kết nối. Khi tắt container
   Postgres, các route như `/earthquakes` không trả lỗi mà treo, nên không bao giờ tới nhánh
   `DATABASE_ERROR`. Demo Bước 3 (DB lỗi) vì vậy không hiển thị được trạng thái lỗi.

### Ảnh hưởng
Demo Bước 1–3 có nguy cơ thất bại (dữ liệu giả che lấp trạng thái DB, biểu đồ KPI không phản ánh dữ liệu thật); Frontend không nhận được cập nhật thời gian thực như thiết kế.

---

## 2. Hiện trạng
- `apps/api/src/gdmas/api/routes/earthquakes.py` (398 dòng): mảng `MOCK_USGS_DATA`, ba chỗ fallback (list, sync, get theo id).
- `apps/api/src/gdmas/api/routes/statistics.py` (83 dòng): `default_time_series` cố định, fallback `1248`.
- `apps/api/src/gdmas/api/routes/stream.py` (320 dòng): route `/stream/earthquakes` và `/stream/broadcast-cleared`, hàng đợi `_connected_sse_queues`, `get_latest_state()`.
- `apps/api/src/gdmas/api/routes/events.py`, `apps/api/src/gdmas/realtime/sse.py`, `apps/api/src/gdmas/realtime/event_manager.py`: 0 dòng.
- `apps/api/src/gdmas/api/router.py`: đăng ký 4 router (`earthquakes`, `statistics`, `stream`, `patterns`).
- `apps/api/src/gdmas/db/connection.py`: `create_engine` chưa đặt `connect_timeout`.
- Frontend: `apps/web/src/hooks/useSSE.ts` và `layouts/DashboardLayout.tsx` kết nối `/api/v1/stream/earthquakes` và lắng nghe `earthquake_detected`, `ingestion_cycle_completed`, `database_cleared`.
- Chưa có test nào cho các route này (`apps/api/tests/unit/` mới có `__init__.py`).

---

## 3. Mục tiêu
- **Mục tiêu:**
  - Không còn dữ liệu giả trong bất kỳ phản hồi nào của `/earthquakes*` và `/statistics/earthquakes`.
  - Phân biệt rõ: **DB lỗi kết nối** → HTTP 500 `DATABASE_ERROR`; **DB hoạt động nhưng rỗng** → HTTP 200 với dữ liệu rỗng thật.
  - `time_series_preview` được tính từ dữ liệu thật trong DB.
  - SSE phát đủ: `heartbeat` định kỳ, `earthquake_detected`, `earthquake_alert` (M ≥ 4.5), `ingestion_cycle_completed`, `database_cleared`; lỗi DB thoáng qua **không** bị coi là "DB bị xóa".
  - Có `GET /api/v1/events/stream` dùng chung generator với `/api/v1/stream/earthquakes`.
  - Khi PostgreSQL không truy cập được, API trả 500 `DATABASE_ERROR` trong vài giây (không treo).
- **Không nằm trong mục tiêu (Out of Scope):**
  - Các endpoint mới của Task 2 (`/health`, `/system/status`, `/analysis/*`, `/predictions`, `/classifications`, `/clusters`, bộ lọc mới của `/earthquakes`) và chuẩn hóa Envelope cho toàn bộ route: thuộc proposal riêng. Các endpoint này đã được làm trên cùng nhánh nhưng thuộc proposal Task 2.
  - Đổi cấu trúc phản hồi `/statistics/earthquakes` cho khớp `API.md` §3.2 (Frontend đang phụ thuộc).
  - Sửa `main.py`, `base.py`, model ORM, migration; sửa Frontend. (`connection.py` chỉ thêm `connect_timeout`, xem §4.)

---

## 4. Giải pháp đề xuất
Tuân thủ **I1** (không đụng `main.py`), **I2 / RULE-03** (thêm tệp mới; sửa tệp cũ chỉ ở phần mock và xử lý lỗi, giữ nguyên đường dẫn và tên route), **I3** (UTC), **I7** (kèm test offline).

- **`apps/api/src/gdmas/api/errors.py` *(mới)*:** hàm `error_response(code, message, status_code, details=None)` trả `JSONResponse` theo Envelope lỗi của `API.md` §2 (`success: false`, `error: {code, message, details}`). Dùng chung với Task 2, không cần sửa `main.py`.
- **`earthquakes.py`:** xóa `MOCK_USGS_DATA` và các nhánh fallback.
  - `GET /earthquakes`: bắt `SQLAlchemyError` → 500 `DATABASE_ERROR`; DB rỗng → 200 với `data: []`, `total: 0`.
  - `GET /earthquakes/{id}`: không tìm thấy → 404 `RESOURCE_NOT_FOUND` (Envelope lỗi).
  - `POST /earthquakes/sync`: không ghi bộ nhớ giả; USGS không truy cập được → 503 `DATA_SOURCE_UNAVAILABLE`; lỗi ghi DB → rollback và 500 `DATABASE_ERROR`.
- **`statistics.py`:** xóa fallback 1248 và `default_time_series`. `time_series_preview` tính từ DB: 8 khoảng 3 giờ trong 24 giờ gần nhất (UTC), mỗi điểm gồm `count` và `avg_mag`; DB rỗng → `[]`. Giữ nguyên cấu trúc phản hồi hiện tại. DB lỗi → 500 `DATABASE_ERROR`.
  - **Chi tiết:** nhãn `time` là giờ bắt đầu của khoảng 3 giờ (UTC, dạng `HH:MM`). DB rỗng trả `[]`; có sự kiện nhưng không có sự kiện nào trong 24 giờ gần nhất thì vẫn trả 8 điểm với `count = 0`.
- **`realtime/sse.py`:** chứa hàng đợi broadcast và generator `earthquake_event_generator(request)` dùng chung. Sửa thụt lề để các khối phát event **nằm trong vòng lặp**. Khi `get_latest_state()` trả `success: False` thì giữ trạng thái cũ, ghi cảnh báo và bỏ qua chu kỳ đó (không phát `database_cleared`). Phát thêm `earthquake_alert` cho sự kiện mới có M ≥ 4.5 (theo `docs/workflow.md` §3.5) và vẫn giữ `earthquake_detected`.
  - **Chi tiết:**
    - `earthquake_alert` là gói riêng, phát thêm (không thay thế) cho sự kiện mới M ≥ 4.5, kể cả khi cùng chu kỳ đó đã phát `ingestion_cycle_completed`.
    - Khi một chu kỳ ingestion vừa xong, các sự kiện mới nằm trong `new_events` của gói `ingestion_cycle_completed`; `earthquake_detected` chỉ phát khi có sự kiện mới mà không có chu kỳ ingestion vừa hoàn tất.
    - Nếu lúc client kết nối mà DB đang lỗi, gói chào mừng trả số 0; lần đọc DB thành công đầu tiên chỉ lấy làm mốc, không phát sự kiện nào.
    - Mọi timestamp trong gói tin dùng UTC có hậu tố `Z`.
- **`stream.py`:** thu gọn thành route mỏng gọi generator chung; **giữ nguyên** `/stream/earthquakes` và `/stream/broadcast-cleared` (Frontend và script demo đang dùng).
- **`events.py`:** route `GET /events/stream` gọi cùng generator. **`router.py`:** thêm `events.router` (một dòng; phối hợp thứ tự với Task 2 vì cùng sửa tệp này).
- **`db/connection.py`:** thêm `connect_args={"connect_timeout": 3}` vào `create_engine` để mất kết nối thì lỗi sau ~3 giây và chạy tới nhánh `DATABASE_ERROR`. Đây là tệp dùng chung (cả các worker dùng chung engine); không đổi gì khác.
- **`contracts/schemas/sse-event.json`:** chỉ **bổ sung** giá trị enum cho `event`. Contracts là vùng dùng chung, ghi rõ chủ vùng `thien` trong mô tả PR.

---

## 5. Phương án đã cân nhắc
### Phương án A: Giữ fallback mock nhưng gắn cờ `is_mock: true`
Ưu: ít sửa, Frontend không đổi. Nhược: vẫn trả dữ liệu giả, trái yêu cầu "không dùng mock tĩnh" của Demo Bước 1 và che trạng thái DB rỗng. Không chọn.
### Phương án B: Đưa generator vào `realtime/sse.py`, hai route cùng gọi (chọn)
Ưu: không trùng mã, đúng gợi ý của Task 3, tận dụng tệp rỗng đã có. Nhược: phải di chuyển một phần `stream.py`. **Chọn.**
### Phương án C: `events.py` import trực tiếp generator từ `stream.py`
Ưu: ít thay đổi hơn. Nhược: hai module phụ thuộc chéo, khó kiểm thử, dễ phát sinh import vòng. Không chọn.
### Phương án D: Xóa `/stream/earthquakes`, chỉ giữ `/events/stream`
Ưu: một đường dẫn duy nhất. Nhược: làm hỏng Frontend hiện tại (`useSSE.ts`). Không chọn.

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Trung bình | Thêm `errors.py`, di chuyển generator sang `realtime/sse.py` |
| Hiệu năng | Thấp | Thêm 1 truy vấn nhóm theo khung 3 giờ cho `time_series_preview` |
| Bảo trì / Open-Closed | Tốt | Giữ nguyên đường dẫn route; xóa mock giúp code gọn hơn |
| Độ tin cậy | Tăng | Phân biệt được DB lỗi và DB rỗng; SSE phát đúng sự kiện |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| 1. Frontend đang quen nhận 200 (dữ liệu giả) khi DB lỗi, sau sửa sẽ nhận 500 | Trung bình | Trung bình | Báo `thien` trước khi merge; kiểm tra Dashboard với DB tắt và DB rỗng |
| 2. Lỗi 404 đổi từ `{"detail": ...}` sang Envelope lỗi, Frontend có thể đang đọc `detail` | Thấp | Thấp | Rà `earthquake-api.ts` trước khi merge |
| 3. SSE bắt đầu phát các event trước đây không phát được, Frontend có thể refetch dày hơn dự kiến | Trung bình | Thấp | Giữ nhịp heartbeat 2–3 giây như hiện tại; kiểm tra thủ công với `curl -N` và Dashboard |
| 4. Lỗi thụt lề SSE chỉ được kết luận từ phân tích cú pháp | Thấp | Thấp | ĐÃ XÁC NHẬN bằng chạy thật (xem §8): trước khi sửa chỉ có 1 gói heartbeat chào mừng rồi im lặng, sau khi sửa heartbeat đều ~2 giây |
| 5. Cùng sửa `router.py` với Task 2 gây xung đột | Thấp | Thấp | Làm tuần tự hoặc gộp vào cùng PR |
| 6. `contracts/` là vùng dùng chung | Thấp | Thấp | Chỉ thêm enum; ghi tên chủ vùng `thien` trong mô tả PR |
| 7. `connect_timeout` trong `connection.py` (tệp dùng chung) ảnh hưởng mọi kết nối DB, kể cả worker | Thấp | Trung bình | 3 giây đủ cho PostgreSQL chạy local/Docker; báo `thien` trước khi merge; nếu worker báo lỗi kết nối lúc khởi động chậm thì tăng giá trị |

Các rủi ro 1 và 2 (Frontend đang đọc 200 hoặc detail) hiện vẫn chưa rà `earthquake-api.ts`. Cần rà trước khi merge.

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-12-api-empty-db-sse-tai.md`
- **Code test tự động (offline):** `apps/api/tests/unit/conftest.py` (SQLite trong bộ nhớ dùng model ORM thật + session giả mô phỏng mất kết nối), `test_earthquakes_routes.py` (29 test), `test_statistics_route.py` (6 test), `test_sse_stream.py` (11 test).
- **Cách kiểm chứng:**
  - `cd apps/api && uv run pytest`, `uv run ruff check src/gdmas/api src/gdmas/realtime`, `uv run ruff format --check` trên các tệp đã sửa.
  - Test route bằng `TestClient` với dependency override `get_db`: DB rỗng → 200 và dữ liệu rỗng; session ném `SQLAlchemyError` → 500 `DATABASE_ERROR`; id không tồn tại → 404 `RESOURCE_NOT_FOUND`; không còn giá trị `1248` hay `MOCK_USGS_DATA`.
  - Test generator SSE với `get_latest_state` được thay thế: `success: False` không phát `database_cleared`; tổng 5 → 0 phát `database_cleared`; có `new_run_info` phát `ingestion_cycle_completed`; có sự kiện mới M ≥ 4.5 phát `earthquake_alert`; không có gì mới thì phát `heartbeat`.
- **Kết quả kiểm chứng đã thực hiện (2026-11-12 đến 2026-11-14):**
  - `uv run pytest tests/unit`: 123 passed (gồm cả test của Task 1 và Task 2); `ruff check` và `ruff format --check` trên `tests/unit` đạt.
  - SSE trước khi sửa (`/stream/earthquakes`): chỉ 1 gói `heartbeat` chào mừng, sau đó chỉ có dòng comment `: ping` mỗi 15 giây (do thư viện sse-starlette), không có heartbeat định kỳ.
  - SSE sau khi sửa: cả `/stream/earthquakes` và `/events/stream` phát `heartbeat` mỗi ~2 giây, timestamp có hậu tố `Z`.
  - `/statistics/earthquakes`: trả số liệu thật (185 sự kiện), không còn 1248.
  - `/earthquakes/99999999`: 404 `RESOURCE_NOT_FOUND` đúng Envelope.
  - Tắt Postgres: trước khi thêm `connect_timeout` request treo; sau khi thêm trả 500 `DATABASE_ERROR` (`connection timeout expired`).
  - CHƯA kiểm tra thủ công: `TRUNCATE` bảng sự kiện (đã có test tự động cho DB rỗng); `ingestion_cycle_completed` và `earthquake_alert` trên luồng thật (worker ingestion đã dừng từ 2026-11-09, chỉ kiểm chứng bằng unit test).
- **Lint:** `ruff check` báo `B008` (`Depends` trong giá trị mặc định) ở cả các tệp cũ như `patterns.py`; đây là quy tắc chung của repo, không phải lỗi logic.

---

## 9. Human Review
Decision: Approved
Reviewer: tai
Review Date: 2026-11-14
Comments: Tác giả tự duyệt theo docs/agent-workflow.md. Phần triển khai đã chạy trước khi ký; bổ sung ngoài bản đầu: sửa `connection.py` (connect_timeout), xem §1 mục 6 và §4.
Scope of Rejection: -

---

## 10. Next Action
Đã triển khai và kiểm thử tự động. Còn lại: rà Frontend (`earthquake-api.ts`, `useSSE.ts`) với mã lỗi mới, kiểm tra thủ công `ingestion_cycle_completed`/`earthquake_alert` khi worker ingestion chạy, báo `thien` về `contracts/` và `connection.py`, rồi mở PR.