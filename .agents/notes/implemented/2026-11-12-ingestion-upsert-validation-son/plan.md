# Implementation Plan: Upsert thực thụ, kiểm tra dữ liệu đầu vào và chịu lỗi cho Ingestion Service (T2)

## Metadata
- ID: 2026-11-12-ingestion-upsert-validation-son
- Proposal: .agents/notes/proposed/2026-11-12-ingestion-upsert-validation-son.md
- Approved By: son
- Approved At: 2026-11-12
- Implementer: agent | son
- Status: validation

---

## 1. Mục tiêu
Thay cơ chế "có rồi thì bỏ qua" bằng Upsert PostgreSQL đúng ERD §4, lọc bản ghi GeoJSON không hợp lệ trước khi lưu,
và ghi `ServiceRun` `FAILED` khi cả URL chính lẫn fallback của USGS đều lỗi — worker không crash.

---

## 2. Phạm vi
### In Scope
- `apps/api/src/gdmas/services/ingestion/parser.py` *(mới — chuẩn hóa & kiểm tra feature)*
- `apps/api/src/gdmas/services/ingestion/upsert.py` *(mới — câu lệnh `INSERT … ON CONFLICT DO UPDATE`)*
- `apps/api/src/gdmas/services/ingestion/service.py` *(sửa — giữ chữ ký cũ, bổ sung tham số tùy chọn)*
- `.agents/notes/proposed/2026-11-12-ingestion-upsert-validation-son.md`
- `.agents/notes/implemented/2026-11-12-ingestion-upsert-validation-son/plan.md`
- `.agents/notes/implemented/2026-11-12-ingestion-upsert-validation-son/status.md`
- `.agents/notes/testcase/2026-11-12-ingestion-upsert-validation-son.md` *(đặc tả testcase)*
- `apps/api/tests/unit/test_ingestion_parser.py`
- `apps/api/tests/unit/test_ingestion_upsert.py`
- `apps/api/tests/unit/test_ingestion_service.py`
- `apps/api/tests/conftest.py` *(bổ sung khi thực thi — thêm `src/` vào `sys.path` để pytest import được `gdmas`)*
### Out of Scope
- `apps/api/src/gdmas/services/ingestion/runner.py` (giữ nguyên CLI và vòng lặp 5 phút)
- `apps/api/src/gdmas/services/demo_seeder.py`, `apps/api/src/gdmas/main.py`, `apps/api/src/gdmas/core/**`
- `apps/api/alembic/**`, `contracts/**`, `docs/api/API.md`

---

## 3. Các bước
### Step 1 — Parser thuần
`parse_feature(feat) -> dict | None`, `parse_features(features) -> (rows, skipped)`: loại feature thiếu `id`, thiếu/không hữu hạn tọa độ,
lat ∉ [-90, 90], lon ∉ [-180, 180], `mag` `None`/`NaN`/không phải số, thiếu `time`; timestamp `tz=timezone.utc`.
### Step 2 — Upsert
`build_upsert_statement(rows)` (ràng buộc `uq_earthquake_source_event`, WHERE theo ERD §4, `RETURNING (xmax = 0)`),
`deduplicate_rows(rows)`, `upsert_events(db, rows) -> UpsertStats`.
### Step 3 — Service
`FeedUnavailableError`, `_fetch_geojson_strict`, `_fetch_features` (chính → fallback), `summarize_error`; `execute_cycle` dùng parser + upsert,
trả thêm `inserted`, `updated`, `unchanged`, `skipped_invalid`. `__init__` nhận thêm `session_factory`, `http_transport` tùy chọn (mặc định như cũ).
### Step 4 — Test offline & testcase
3 file test trong `apps/api/tests/unit/`, cập nhật `testcase/<id>.md`.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có (không migration, không đổi endpoint, không biến môi trường mới).

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] **Đã tạo đặc tả testcase** tại `.agents/notes/testcase/2026-11-12-ingestion-upsert-validation-son.md`
- [x] **Đã tạo và chạy pass file unit test offline** (3 file `tests/unit/test_ingestion_*.py`)
- [x] Backend test: `cd apps/api && uv run pytest tests/unit -q`
- [x] Backend lint/format trên các file đụng tới: `uv run ruff check <files> && uv run ruff format --check <files>`
- [x] Kiểm tra nhất quán notes: `python3 scripts/notes_index.py --check`
- [x] SQL compile chứa `ON CONFLICT ON CONSTRAINT uq_earthquake_source_event DO UPDATE` và điều kiện WHERE của ERD §4

---

## 6. Rủi ro khi làm
- Không có PostgreSQL trong CI/test → kiểm bằng compile SQL + fake session; chạy thật trên Docker T1 là bước thủ công.
- Ruff toàn repo đang lỗi sẵn (ngoài phạm vi) → chỉ ép sạch trên file trong In Scope.

---

## 7. Rollback
Revert PR (chỉ thêm 2 tệp và sửa `service.py`, không có migration).

---

## 8. Ghi chú
`records_processed` = `inserted + updated`; `new_records` giữ nghĩa "số sự kiện mới chèn" để `runner.py` không phải sửa.
