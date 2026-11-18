# Testcase: Bỏ dữ liệu giả, xử lý DB rỗng/DB lỗi và SSE (Terminal 6)

## Metadata
- ID: 2026-11-12-api-empty-db-sse-tai
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-12-api-empty-db-sse-tai.md
- Target: apps/api/src/gdmas/api/routes/ (earthquakes.py, statistics.py, stream.py, events.py), apps/api/src/gdmas/realtime/sse.py
- Test File: apps/api/tests/unit/conftest.py, test_earthquakes_routes.py, test_statistics_route.py, test_sse_stream.py
- Author: agent | tai
- Created: 2026-11-12
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng kiểm chứng:** `/earthquakes`, `/earthquakes/{id}`, `/earthquakes/sync`, `/statistics/earthquakes`, generator SSE (`earthquake_event_generator`), `broadcast_database_cleared_event`, cả hai route SSE.
- **Ràng buộc GDMAS liên quan:**
  - [x] Tách biệt 7 Terminals (I1).
  - [x] Chuẩn **UTC** (I3).
  - [x] Không fallback mock khi DB rỗng (I5 / Demo §4).
  - [x] Unit test chạy **offline 100%** (SQLite trong bộ nhớ + `BrokenSession` — I7).

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- **Môi trường / Mock:** `conftest.py` SQLite trong bộ nhớ dùng model ORM thật, ánh xạ `JSONB`→`JSON`, `BigInteger`→`INTEGER`, đăng ký hàm `floor` cho SQLite; `BrokenSession` mô phỏng PostgreSQL mất kết nối; `FakeRequest` cho generator SSE (ngắt sau n lần).
```json
{
  "sse_initial": {"success": true, "total": 5, "max_id": 10, "latest_run_id": 1, "new_events": [], "new_run_info": null},
  "sse_new_event": {"new_events": [{"id": 11, "magnitude": 4.0}], "max_id": 11},
  "sse_strong_event": {"new_events": [{"id": 11, "magnitude": 4.5}, {"id": 12, "magnitude": 3.0}], "max_id": 12},
  "sse_ingestion_run": {"new_run_info": {"records_processed": 3, "finished_at": null}, "latest_run_id": 2}
}
```

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi (Assertions) | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | `/earthquakes` DB rỗng trả rỗng thật | Resilience | Không có sự kiện | `200`, `data=[]`, `total=0`, `total_pages=0` | `PASS` |
| `TC-02` | `/earthquakes` DB lỗi trả 500, không mock | Negative | `BrokenSession` | `500 DATABASE_ERROR`, không có data, không có 1248 | `PASS` |
| `TC-03` | `/earthquakes/{id}` DB lỗi | Negative | `BrokenSession` | `500 DATABASE_ERROR` | `PASS` |
| `TC-04` | Không còn `MOCK_USGS_DATA` trong module | Static | `hasattr` | `False` | `PASS` |
| `TC-05` | Danh sách trả đúng Envelope | Functional | 2 sự kiện | `200`, `total=2`, đúng 2 `source_event_id` | `PASS` |
| `TC-06` | Phân trang | Functional | 5 sự kiện, limit 2 | Trang 1 có 2, trang 3 có 1, `total_pages=3` | `PASS` |
| `TC-07` | Sắp xếp theo magnitude desc | Functional | 3 sự kiện | `[6.0, 4.5, 3.0]` | `PASS` |
| `TC-08` | Trường sort sai | Negative | `sort_by=password` | `422` | `PASS` |
| `TC-09` | Lọc độ lớn | Functional | `min=4`, `max=6` | Đúng sự kiện | `PASS` |
| `TC-10` | Lọc độ sâu | Functional | `min_depth=100` | Đúng sự kiện | `PASS` |
| `TC-11` | Lọc bounding box | Functional | `min_lat=-30`, `max_lat=0`, `min_lon=-180`, `max_lon=-160` | Đúng 2 sự kiện | `PASS` |
| `TC-12` | Lọc khoảng thời gian ISO UTC | Functional | `start_time`/`end_time` | Đúng sự kiện | `PASS` |
| `TC-13` | Lọc tìm kiếm place/id | Functional | `search=fiji` / `search=ev0002` | Đúng sự kiện | `PASS` |
| `TC-14` | Lọc không khớp trả rỗng, không lỗi | Resilience | `min_magnitude=8` | `200`, `data=[]` | `PASS` |
| `TC-15` | Khoảng đảo ngược trả 400 | Negative | 5 cặp min/max | `400 VALIDATION_ERROR`, `details.field` đúng | `PASS` |
| `TC-16` | Thời gian sai định dạng | Negative | `start_time=hôm qua` | `400`, `field=start_time` | `PASS` |
| `TC-17` | Thời gian thiếu múi giờ = UTC | Boundary | `2026-11-09T09:00:00` | Đúng sự kiện | `PASS` |
| `TC-18` | Chi tiết theo id số | Functional | `/earthquakes/{id}` | `200`, đúng `source_event_id` | `PASS` |
| `TC-19` | Chi tiết theo source_event_id | Functional | `/earthquakes/ev0007` | `200`, đúng `place` | `PASS` |
| `TC-20` | Chi tiết không tồn tại | Negative | `99999999` | `404 RESOURCE_NOT_FOUND`, `details.event_id` | `PASS` |
| `TC-21` | `/sync` chèn mới, bỏ qua trùng | Functional | 1 trùng + 1 mới | `synced_count=1`, tổng = 2 | `PASS` |
| `TC-22` | `/sync` bỏ feature thiếu magnitude | Resilience | `mag=None` | `synced_count=0` | `PASS` |
| `TC-23` | `/sync` USGS không truy cập được | Negative | `ConnectError` | `503 DATA_SOURCE_UNAVAILABLE`, không báo thành công giả | `PASS` |
| `TC-24` | `/sync` DB lỗi | Negative | `BrokenSession` | `500 DATABASE_ERROR` | `PASS` |
| `TC-25` | `/statistics/earthquakes` DB rỗng | Resilience | Không sự kiện | `200`, toàn 0, `time_series_preview=[]`, không có 1248 | `PASS` |
| `TC-26` | `/statistics/earthquakes` DB lỗi | Negative | `BrokenSession` | `500 DATABASE_ERROR`, không có 1248 | `PASS` |
| `TC-27` | KPI tính từ DB | Functional | 4 sự kiện đa dạng | Đúng total, strong, moderate, minor, recent_24h, max, avg | `PASS` |
| `TC-28` | Time series 8 điểm tính từ sự kiện | Functional | 2 sự kiện trong 40 phút | 8 điểm, tổng = 2, điểm cuối count=2, avg=4.0, các điểm khác 0 | `PASS` |
| `TC-29` | Time series không phải danh sách cứng | Functional | Thêm sự kiện giữa 2 lần gọi | Tổng count tăng 1 → 2 | `PASS` |
| `TC-30` | Sự kiện > 24h bị loại khỏi series | Boundary | 1 sự kiện 3 ngày trước | `total=1`, tổng series = 0 | `PASS` |
| `TC-31` | Gói đầu tiên là heartbeat chào mừng | Functional | `get_latest_state` thay thế `["heartbeat"]` | `total_events=5` | `PASS` |
| `TC-32` | Heartbeat định kỳ khi không có gì mới | Functional | 2 chu kỳ rỗng | 3 heartbeat | `PASS` |
| `TC-33` | Có sự kiện mới phát `earthquake_detected` (không alert) | Functional | M4.0 mới | `["heartbeat", "earthquake_detected"]` | `PASS` |
| `TC-34` | Sự kiện mạnh phát `earthquake_alert` | Functional | M4.5 và M3.0 mới | `["heartbeat", "earthquake_detected", "earthquake_alert"]`, alert đúng id, `max_magnitude=4.5` | `PASS` |
| `TC-35` | Ingestion xong phát `ingestion_cycle_completed` | Functional | `new_run_info` | `["heartbeat", "ingestion_cycle_completed"]`, `records_processed=3` | `PASS` |
| `TC-36` | Tổng về 0 phát `database_cleared` | Functional | `total=5 → 0` | `["heartbeat", "database_cleared"]` | `PASS` |
| `TC-37` | DB lỗi thoáng qua không phát `database_cleared` | Resilience | `success: False` rồi bình thường | Không có `database_cleared`; `["heartbeat", "heartbeat"]` | `PASS` |
| `TC-38` | DB lỗi rồi rỗng vẫn báo cleared đúng 1 lần | Resilience | lỗi → `total=0` | `database_cleared` xuất hiện đúng 1 lần | `PASS` |
| `TC-39` | Gói tin đúng hợp đồng, timestamp UTC Z | Boundary | Gói chào mừng `{event, data, timestamp}` | `timestamp.endswith("Z")` | `PASS` |
| `TC-40` | Broadcast đẩy `database_cleared` tới client | Functional | 1 queue trong `_connected_sse_queues` | Trả $\ge 1$, queue nhận `database_cleared` | `PASS` |
| `TC-41` | Cả hai đường dẫn SSE đã đăng ký | Static | `app.openapi()["paths"]` | Có `/api/v1/events/stream` và `/api/v1/stream/earthquakes` | `PASS` |

*(Test ID ở trên gộp theo nhóm; file thực tế có 29 test earthquakes + 6 statistics + 11 SSE = 46 test Task 3.)*

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/api && uv run pytest tests/unit/test_earthquakes_routes.py tests/unit/test_statistics_route.py tests/unit/test_sse_stream.py -v
cd apps/api && uv run pytest tests/unit -q
cd apps/api && uv run ruff check tests/unit
cd apps/api && uv run ruff format --check tests/unit
```

- **Ngày chạy cuối:** `2026-11-14`
- **Kết quả quan sát thật:** `46 test Task 3 đạt; toàn bộ tests/unit 123 passed; ruff check All checks passed!; ruff format --check 7 files already formatted.`
- **Kiểm chứng thủ công:**
  - SSE trước sửa: chỉ 1 heartbeat chào mừng rồi `: ping` mỗi 15 giây (sse-starlette), không có heartbeat định kỳ.
  - SSE sau sửa: heartbeat ~2 giây trên cả `/stream/earthquakes` và `/events/stream`, timestamp có `Z`.
  - `/statistics/earthquakes` trả 185 sự kiện thật, không có 1248.
  - `/earthquakes/99999999` → `404 RESOURCE_NOT_FOUND` đúng Envelope.
  - Tắt Postgres: trước `connect_timeout` request treo; sau khi thêm trả `500 DATABASE_ERROR` (connection timeout expired).
  - Chưa kiểm tra thủ công: `TRUNCATE` bảng sự kiện (đã có test tự động); `ingestion_cycle_completed`/`earthquake_alert` trên luồng thật (worker ingestion dừng từ 2026-11-09).
- **Hạn chế:** SQLite không chạy cú pháp PostgreSQL riêng (`func.timezone`); đã kiểm chứng thủ công trên DB thật.

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- `none`