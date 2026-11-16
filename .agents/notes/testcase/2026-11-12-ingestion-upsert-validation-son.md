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
- Related Bugs: BUG-son-001, BUG-son-002, BUG-son-003

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
| `TC-17` | Giữ nguyên khóa ID, loại ID quá dài (BUG-son-001) | Regression | ID đúng 64 ký tự, ID 65 ký tự, fallback `code`, hai ID chung tiền tố 64 ký tự | Giữ nguyên ID hợp lệ; loại ID quá dài và đếm skipped, không gộp nhầm sự kiện | `PASS` |
| `TC-18` | Tách thiếu độ sâu và độ sâu sai (BUG-son-002) | Regression | Không có phần tử độ sâu; giá trị `bad`, bool, `None`, `NaN`, ±inf; số 0, số âm, chuỗi số | Chỉ thiếu phần tử mới mặc định 0.0; loại độ sâu sai; giữ số hữu hạn | `PASS` |
| `TC-19` | Số nguyên vượt miền float (BUG-son-003) | Regression | `10**400` ở magnitude, time, longitude, latitude, depth và updated | Không ném lỗi; loại riêng feature có trường bắt buộc sai; updated tùy chọn sai thành None | `PASS` |
| `TC-20` | Chu kỳ có feature lỗi xen giữa dữ liệu hợp lệ | Regression | 2 feature hợp lệ + ID dài + độ sâu sai ở bản cập nhật mới hơn + magnitude vượt miền float | SUCCESS, inserted=2, skipped_invalid=3; chỉ 2 feature hợp lệ tới upsert, không rollback | `PASS` |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/api && uv run pytest tests/unit/test_ingestion_parser.py tests/unit/test_ingestion_upsert.py tests/unit/test_ingestion_service.py -v
```

- **Ngày chạy cuối:** `2026-11-13`
- **Kết quả quan sát thật:** `77 passed in 0.92s`; toàn bộ test offline, HTTP/DB được mock. Lệnh trên máy Windows: `.venv/Scripts/python.exe -X utf8 -m pytest tests/unit/test_ingestion_parser.py tests/unit/test_ingestion_upsert.py tests/unit/test_ingestion_service.py -q -p no:cacheprovider -o asyncio_default_fixture_loop_scope=function`.
- **Kiểm chứng trước/sau bản sửa:** test parser/service trước sửa có `17 failed, 52 passed`, tái hiện cả 3 finding; sau sửa toàn bộ 3 tệp ingestion đạt `77 passed`. Test cũ kỳ vọng cắt ID được đổi theo yêu cầu sửa BUG-son-001; vẫn giữ kiểm tra fallback `properties.code`, không bỏ test hay thêm skip.
- **Kiểm tích hợp thủ công trên PostgreSQL 16 (Docker T1, 2026-11-12):**
  - `alembic upgrade head` → ràng buộc `uq_earthquake_source_event UNIQUE (source, source_event_id)` tồn tại.
  - Lần 1 (USGS `all_month`): `inserted=9847`, `skipped_invalid=0`, 8.5s; `ServiceRun` `SUCCESS` 9847.
  - Sửa tay: A (`magnitude=99`, `source_updated_at` lùi 1 ngày), B (`source_updated_at=NULL`), C (`magnitude=77`, `source_updated_at` tiến 1 ngày) rồi nạp lại → `updated=2`, `unchanged=9844`: A về 0.9, B có lại `source_updated_at`, C giữ 77 (đúng điều kiện WHERE ERD §4; sau đó đã khôi phục C từ `raw_data`). `count(*) = count(distinct (source, source_event_id)) = 9847`.
  - URL chính từ chối kết nối + fallback trả payload không phải JSON → `ServiceRun` `FAILED`, `error_message` bắt đầu bằng `FeedUnavailableError`, ≤ 200 ký tự.

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- `BUG-son-001` — ID dài bị cắt gây trùng khóa sự kiện; đã sửa và có TC-17/TC-20.
- `BUG-son-002` — độ sâu sai bị đổi thành 0.0; đã sửa và có TC-18/TC-20.
- `BUG-son-003` — số nguyên vượt miền float làm thất bại cả batch; đã sửa và có TC-19/TC-20.
