# Proposal: Upsert thực thụ, kiểm tra dữ liệu đầu vào và chịu lỗi cho Ingestion Service (T2)

## Metadata
- ID: 2026-11-12-ingestion-upsert-validation-son
- Author: agent | son
- Created: 2026-11-12
- Type: feature
- Status: approved
- Priority: high
- Area: apps/api/src/gdmas/services/ingestion/
- Architecture Impact: none
  <!-- Thực thi đúng chiến lược Upsert đã đặc tả ở docs/architecture/ERD.md §4 và SAD §4.2; không đổi schema, không đổi contract API. -->
- Related Docs:
  - docs/quyuocchung.md
  - docs/coding-rules.md
  - docs/architecture/ERD.md (§4 Upsert Strategy)
  - docs/task/son.md (Task 1, phần Ingestion của Task 4)
- Related Proposals:
  - .agents/notes/proposed/2026-11-12-analysis-four-patterns-son.md (độc lập, chạy song song được)
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Terminal 2 (`python -m gdmas.services.ingestion.runner`) quét USGS mỗi 5 phút và ghi `service_runs`.
### Vấn đề
1. `_save_feature_if_new` (`service.py:122`) chỉ kiểm tra tồn tại theo `source_event_id` rồi `return False` → khi USGS hiệu chỉnh `magnitude`/`depth_km`/tọa độ/`place`, CSDL giữ số liệu cũ. Truy vấn trùng cũng chỉ lọc `source_event_id`, bỏ qua `source` (ràng buộc thật là `UNIQUE (source, source_event_id)`).
2. Không kiểm tra hợp lệ: thiếu tọa độ bị gán mặc định `0.0, 0.0` (điểm "Null Island" giả), không chặn `latitude ∉ [-90, 90]`, `longitude ∉ [-180, 180]`, `mag` là `NaN`/chuỗi; thiếu `time` thì gán `now()` (sai lệch chuỗi thời gian).
3. `_fetch_geojson` nuốt mọi lỗi (timeout, 5xx, mất mạng) và trả `[]` → chu kỳ vẫn ghi `ServiceRun.status="SUCCESS"` với 0 bản ghi, che giấu sự cố. `error_message` lưu nguyên `str(e)` (có thể dài/chứa URL nội bộ).
### Ảnh hưởng
Dữ liệu thô sai/lỗi thời làm hỏng toàn bộ 6 Patterns phía sau (T3–T5) và kịch bản Demo phục hồi dữ liệu.

---

## 2. Hiện trạng
- `apps/api/src/gdmas/services/ingestion/service.py` — `IngestionService.execute_cycle`, `_fetch_geojson`, `_save_feature_if_new` (ORM `db.add`).
- `apps/api/src/gdmas/services/ingestion/runner.py` — vòng lặp 5 phút, đã bắt `Exception` để không crash.
- `apps/api/src/gdmas/models/earthquake.py` — `UniqueConstraint("source", "source_event_id", name="uq_earthquake_source_event")`.
- `apps/api/tests/` — chưa có test nào (`conftest.py` rỗng).

---

## 3. Mục tiêu
- **Mục tiêu:**
  - Upsert chuẩn PostgreSQL `INSERT … ON CONFLICT (source, source_event_id) DO UPDATE … WHERE earthquake_events.source_updated_at IS NULL OR EXCLUDED.source_updated_at > earthquake_events.source_updated_at` — khớp nguyên văn ERD §4.
  - Đếm và báo cáo tách bạch `inserted` / `updated` / `skipped_invalid` mỗi chu kỳ (`records_processed = inserted + updated`).
  - Kiểm tra hợp lệ GeoJSON trước khi lưu, ghi `logger.warning` cho bản ghi bị loại; mọi timestamp mang `timezone.utc`.
  - Lỗi nguồn (timeout / HTTP 5xx / mất mạng ở cả URL chính và fallback) → `ServiceRun.status="FAILED"` với thông báo ngắn đã làm sạch; session đóng sạch; worker tiếp tục chu kỳ kế.
- **Không nằm trong mục tiêu (Out of Scope):** đổi schema/migration; đổi `runner.py` CLI; thêm cờ `--once` cho ingestion; sửa `demo_seeder.py`; đổi API T6.

---

## 4. Giải pháp đề xuất
Tuân thủ RULE-03: giữ nguyên chữ ký `IngestionService.__init__`, `execute_cycle()`, `_fetch_geojson()`, `_save_feature_if_new()` (giữ lại làm wrapper tương thích), chỉ bổ sung.

1. **Tệp mới `apps/api/src/gdmas/services/ingestion/parser.py`** (hàm thuần, không I/O — dễ test offline):
   - `parse_feature(feat: dict) -> dict | None`: chuẩn hóa 1 feature thành dict cột `earthquake_events`; trả `None` + log cảnh báo khi thiếu `id`, thiếu/không đủ 2 tọa độ, tọa độ không phải số hữu hạn hoặc ngoài khoảng WGS84, `mag` `None`/`NaN`/không ép được `float`, thiếu `time`. `depth_km` thiếu → `0.0` (USGS cho phép), `event_time`/`source_updated_at` ép `tz=timezone.utc`.
2. **Tệp mới `apps/api/src/gdmas/services/ingestion/upsert.py`:**
   - `build_upsert_statement(rows: list[dict])` dùng `sqlalchemy.dialects.postgresql.insert(EarthquakeEvent).on_conflict_do_update(constraint="uq_earthquake_source_event", set_=…, where=…)`, `ingested_at = func.now()`, kèm `RETURNING (xmax = 0) AS inserted` để phân biệt insert/update.
   - `upsert_events(db, rows) -> UpsertStats(inserted, updated, unchanged)`; khử trùng lặp trong cùng batch theo `(source, source_event_id)` giữ bản `source_updated_at` mới nhất (tránh lỗi `ON CONFLICT DO UPDATE command cannot affect row a second time`).
3. **Sửa `service.py`:**
   - Thêm ngoại lệ `FeedUnavailableError` (trong `gdmas/core/exceptions.py` nếu phù hợp, hoặc cục bộ module) và hàm mới `_fetch_geojson_strict(url)` ném lỗi khi timeout/5xx/JSON hỏng; `_fetch_geojson` cũ giữ nguyên hành vi để không phá caller khác.
   - `execute_cycle`: thử URL chính → fallback `all_day`; chỉ khi **cả hai** lỗi mới đánh `FAILED`. Feed trả 200 nhưng rỗng vẫn là `SUCCESS` với 0 bản ghi.
   - `error_message` = `"<TênLoạiLỗi>: <tóm tắt ≤ 200 ký tự>"`, không kèm header/credential.
   - Kết quả trả về bổ sung khóa `inserted`, `updated`, `skipped_invalid` (giữ khóa cũ `new_records`, `total_in_db` cho `runner.py`).
4. **Test offline (I7):** `apps/api/tests/unit/test_ingestion_parser.py`, `apps/api/tests/unit/test_ingestion_upsert.py`, `apps/api/tests/unit/test_ingestion_service.py` — mock `httpx.Client` bằng `httpx.MockTransport`/`monkeypatch`, mock `SessionLocal`; kiểm SQL Upsert bằng cách compile câu lệnh với dialect PostgreSQL (không cần DB thật).

---

## 5. Phương án đã cân nhắc
### Phương án A: ORM "select rồi cập nhật thuộc tính" trong Python
Ưu: chạy được trên SQLite trong test. Nhược: N+1 truy vấn mỗi chu kỳ, có race condition nếu 2 worker chạy cùng lúc, lệch đặc tả ERD §4. **Không chọn.**
### Phương án B: `postgresql.insert … on_conflict_do_update` (chọn)
Ưu: đúng ERD §4, nguyên tử, 1 câu lệnh/batch, an toàn đồng thời. Nhược: không chạy trên SQLite → test kiểm bằng compile SQL + mock session; kiểm thật trên PostgreSQL ở mức thủ công/integration khi có Docker.

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | +2 tệp nhỏ | Tách parser/upsert thuần để test offline |
| Hiệu năng | Tốt hơn | 1 câu bulk upsert thay vì 1 SELECT + 1 INSERT mỗi feature |
| Bảo trì / Open-Closed | Giữ chữ ký cũ | Hàm cũ vẫn tồn tại, logic mới ở tệp mới |
| Độ tin cậy | Tăng | Lỗi nguồn hiện rõ `FAILED` thay vì `SUCCESS` giả |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Test compile SQL không bắt được lỗi runtime PostgreSQL | Trung bình | Trung bình | Chạy thủ công 1 chu kỳ trên Docker T1 trước khi merge, ghi kết quả vào testcase |
| `xmax = 0` là chi tiết nội bộ PostgreSQL | Thấp | Thấp | Chỉ dùng để thống kê; sai lệch không ảnh hưởng dữ liệu |
| Loại bỏ bản ghi thiếu `time` làm giảm số sự kiện | Thấp | Thấp | USGS luôn có `time`; ghi cảnh báo để theo dõi |
| Môi trường dev chưa có `uv` / `statsmodels` | Cao (máy hiện tại) | Trung bình | Cài `uv` rồi `uv sync` trước Pha 4 (xem câu hỏi cuối phiên) |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-12-ingestion-upsert-validation-son.md`
- **Code test tự động (offline):**
  - `apps/api/tests/unit/test_ingestion_parser.py` — feature hợp lệ; thiếu tọa độ; lat/lon ngoài khoảng; `mag` `None`/`NaN`/chuỗi; timestamp ra `tzinfo == timezone.utc`.
  - `apps/api/tests/unit/test_ingestion_upsert.py` — SQL compile chứa `ON CONFLICT ON CONSTRAINT uq_earthquake_source_event DO UPDATE` + điều kiện `WHERE … IS NULL OR … >`; khử trùng lặp trong batch giữ bản mới nhất.
  - `apps/api/tests/unit/test_ingestion_service.py` — nạp mới; cập nhật khi `source_updated_at` mới hơn; bỏ qua bản cũ; HTTP 503 + timeout ở cả 2 URL → `ServiceRun` `FAILED`, không ném ngoại lệ; fallback thành công khi URL chính lỗi.
- **Cách kiểm chứng:** `cd apps/api && uv run pytest tests/unit -q` và `uv run ruff check . && uv run ruff format --check .`.

---

## 9. Human Review
Decision: Approved
Reviewer: son
Review Date: 2026-11-12
Comments: Tác giả `son` xác nhận trong chat "approve cả 2" (2026-11-12); chấp nhận phương án snapshot analysis_results và giữ analysis_type `time_series`.
Scope of Rejection: -

---

## 10. Next Action
Chờ thành viên thực hiện / đồng đội xác nhận §9 để bắt đầu `build-implementation` trên nhánh `feat/2026-11-12-ingestion-upsert-validation-son`.
