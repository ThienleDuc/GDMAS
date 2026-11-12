# Testcase: Upsert, kiểm tra dữ liệu đầu vào và chịu lỗi của Ingestion Service (T2)

## Metadata
- ID: 2026-11-12-ingestion-upsert-validation-son
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-12-ingestion-upsert-validation-son.md
- Target: apps/api/src/gdmas/services/ingestion/
- Test File: apps/api/tests/unit/test_ingestion_parser.py, apps/api/tests/unit/test_ingestion_upsert.py, apps/api/tests/unit/test_ingestion_service.py
- Author: agent | son
- Created: 2026-11-12
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng kiểm chứng:** `parser.parse_feature` / `parse_features`, `upsert.build_upsert_statement` / `deduplicate_rows` / `upsert_events`,
  `IngestionService.execute_cycle` (luồng thành công, fallback, lỗi nguồn) và `summarize_error`.
- **Ràng buộc GDMAS liên quan:**
  - [x] Tách biệt 7 Terminals (I1 — không nhúng worker vào `main.py`).
  - [x] Chuẩn **UTC** (`TIMESTAMPTZ` / ISO 8601 `Z`) & tọa độ **WGS84** (`latitude`, `longitude`) (I3).
  - [x] Không fallback về dữ liệu mock tĩnh khi DB rỗng (I5 / kịch bản Demo §4).
  - [x] Unit test chạy **offline 100%** (mock HTTP/USGS/DB ngoài — I7).

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- **Môi trường / Mock:**
  - HTTP: `httpx.MockTransport` truyền qua `IngestionService(http_transport=...)` — không gọi mạng USGS thật.
  - DB: `FakeSession` (ghi lại `add`/`commit`/`rollback`) truyền qua `IngestionService(session_factory=...)`; `upsert_events` được thay bằng hàm giả trả `UpsertStats`.
  - SQL Upsert: compile câu lệnh với `sqlalchemy.dialects.postgresql.dialect()` (không cần PostgreSQL thật).
```json
{
  "sample_feature": {
    "type": "Feature",
    "id": "us7000test",
    "properties": { "mag": 5.8, "magType": "mww", "place": "Near East Coast of Honshu, Japan",
                    "time": 1794355200000, "updated": 1794358800000, "url": "https://earthquake.usgs.gov/..." },
    "geometry": { "type": "Point", "coordinates": [142.38, 38.29, 24.5] }
  }
}
```

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi (Assertions) | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Parse feature hợp lệ | Functional | `sample_feature` | Dict đủ cột, `source="USGS"`, `event_time`/`source_updated_at` có `tzinfo=UTC`, lon/lat/depth đúng thứ tự GeoJSON | `PASS` |
| `TC-02` | Thiếu tọa độ / tọa độ không phải số | Boundary | `coordinates` rỗng, `None`, `["a", 1]`, `NaN` | `None` (bị loại) + log cảnh báo | `PASS` |
| `TC-03` | Biên WGS84 | Boundary | lat = ±90, lon = ±180 (hợp lệ); lat 90.1, lon -180.5 (không hợp lệ) | Biên được giữ, ngoài khoảng bị loại | `PASS` |
| `TC-04` | `mag` không hợp lệ | Boundary | `None`, `NaN`, `"abc"`, `True` | Bị loại | `PASS` |
| `TC-05` | Thiếu `time` / thiếu `id` | Negative | không có `time`; không có `id` lẫn `code` | Bị loại (không gán `now()`) | `PASS` |
| `TC-06` | Thiếu độ sâu | Boundary | `coordinates` chỉ 2 phần tử | `depth_km = 0.0` | `PASS` |
| `TC-07` | SQL Upsert đúng ERD §4 | Functional | `build_upsert_statement([row])` compile PostgreSQL | Có `ON CONFLICT ON CONSTRAINT uq_earthquake_source_event DO UPDATE`, cập nhật magnitude/depth/tọa độ/place, `ingested_at = now()`, WHERE `source_updated_at IS NULL OR excluded.source_updated_at > …`, `RETURNING (xmax = 0)` | `PASS` |
| `TC-08` | Khử trùng lặp trong batch | Functional | 2 bản cùng `source_event_id`, bản sau `updated` mới hơn / cũ hơn / `None` | Giữ bản mới nhất, thứ tự ổn định | `PASS` |
| `TC-09` | Thống kê insert / update / unchanged | Functional | Fake `db.execute` trả cờ `inserted` [True, False]; 3 dòng đầu vào | `inserted=1, updated=1, unchanged=1`; batch rỗng không gọi DB | `PASS` |
| `TC-10` | Chu kỳ thành công | Functional | Transport trả 200 với 3 feature (1 lỗi tọa độ) | `ServiceRun` `SUCCESS`, `records_processed = inserted + updated`, `skipped_invalid=1` | `PASS` |
| `TC-11` | HTTP 503 ở cả URL chính & fallback | Resilience | Transport trả 503 | Không ném ngoại lệ, `success=False`, `ServiceRun` `FAILED`, `error_message` ngắn chứa `FeedUnavailableError` | `PASS` |
| `TC-12` | Timeout / mất mạng | Resilience | Transport ném `httpx.ConnectTimeout` | `ServiceRun` `FAILED`, session `rollback` rồi đóng | `PASS` |
| `TC-13` | Fallback cứu được | Resilience | URL chính 503, `all_day` 200 | `SUCCESS` | `PASS` |
| `TC-14` | Feed rỗng hợp lệ | Empty Data | 200 `{"features": []}` ở cả hai URL | `SUCCESS`, 0 bản ghi, không chèn dữ liệu giả | `PASS` |
| `TC-15` | Payload hỏng | Negative | 200 nhưng body không phải JSON / thiếu `features` | Coi như nguồn lỗi → `FAILED` khi cả hai URL hỏng | `PASS` |
| `TC-16` | Làm sạch thông báo lỗi | Security | Ngoại lệ chứa `postgresql://user:secret@host`, query string, chuỗi dài | Che `user:secret`, bỏ query string, ≤ 200 ký tự | `PASS` |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/api && uv run pytest tests/unit/test_ingestion_parser.py tests/unit/test_ingestion_upsert.py tests/unit/test_ingestion_service.py -v
```

- **Ngày chạy cuối:** `2026-11-12`
- **Kết quả quan sát thật:** `56 passed in 0.88s` (test_ingestion_parser: 33, test_ingestion_upsert: 9, test_ingestion_service: 14). Ruff check/format sạch trên các file đã đụng.
- **Chưa kiểm:** chạy Upsert trên PostgreSQL thật (cần Docker T1) — ghi ở `status.md` Known Issues.

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- `none`
