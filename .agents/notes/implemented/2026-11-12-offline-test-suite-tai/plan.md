# Implementation Plan: Bộ kiểm thử offline cho Prediction Worker và REST/SSE

## Metadata
- ID: 2026-11-12-offline-test-suite-tai
- Proposal: .agents/notes/proposed/2026-11-12-offline-test-suite-tai.md
- Approved By: tai
- Approved At: 2026-11-14
- Implementer: agent | tai
- Status: completed

---

## 1. Mục tiêu
Viết bộ kiểm thử offline 100% cho Prediction Worker (Task 1) và toàn bộ REST/SSE (Task 2 + 3), đạt `uv run pytest tests/unit` và ruff sạch trên `tests/unit`.

---

## 2. Phạm vi
### In Scope
- `apps/api/tests/unit/conftest.py` *(mới)*
- `apps/api/tests/unit/test_prediction_inference.py` *(mới)*
- `apps/api/tests/unit/test_prediction_service.py` *(mới)*
- `apps/api/tests/unit/test_earthquakes_routes.py` *(mới)*
- `apps/api/tests/unit/test_statistics_route.py` *(mới)*
- `apps/api/tests/unit/test_system_prediction_routes.py` *(mới)*
- `apps/api/tests/unit/test_sse_stream.py` *(mới)*
- `.agents/notes/testcase/2026-11-12-offline-test-suite-tai.md`
### Out of Scope
- Test tích hợp PostgreSQL/USGS thật.
- Sửa code sản phẩm, `demo_seeder.py`, ORM, migration, `main.py`, `contracts/`, `apps/web/`.
- Test Frontend.

---

## 3. Các bước
### Step 1 — conftest.py dùng chung
SQLite trong bộ nhớ (`StaticPool`), đăng ký hàm `floor`; `@compiles(JSONB)` → `JSON`, `@compiles(BigInteger)` → `INTEGER`; fixture `db`, `client`, `broken_client`; helper `add_event`.

### Step 2 — Test prediction inference
Fixture tự huấn luyện ARIMA(1,0,0) nhỏ; 28 test cho `build_series`, `forecast_next` (bất đẳng thức, cận dưới cắt 0, ngày thiếu, lịch sử ngắn, model type khác), `classify_next` (tổng xác suất = 1, nhãn max, chuỗi mức cao), `label_of_count` biên, `forecast_model_info`, `classifier_model_info`, `load_artifacts` thiếu file.

### Step 3 — Test prediction service
`FakeSession` thay PostgreSQL; 16 test cho `_complete_day_counts` (rỗng, hôm nay, hôm qua, map rows), `_fill_actuals` (điền đúng, DB thiếu ngày, DB rỗng), `_predict` (end-to-end, ghi đè, ưu tiên DB, cắt tên model 64 ký tự, lỗi sạch), `execute_cycle` (SUCCESS, FAILED không ném, cắt lỗi 1000 ký tự, thiếu model).

### Step 4 — Test earthquakes route
29 test: DB rỗng, DB lỗi (500 không `1248`), không còn `MOCK_USGS_DATA`, danh sách, phân trang, sắp xếp, lọc độ lớn/độ sâu/bounding box/thời gian/tìm kiếm, 400 đảo ngược, thời gian sai, thiếu múi giờ = UTC, chi tiết theo id và `source_event_id`, 404, `/sync` chèn/bỏ trùng/thiếu magnitude/USGS lỗi/DB lỗi.

### Step 5 — Test statistics route
6 test: DB rỗng (toàn 0, series rỗng, không `1248`), DB lỗi (500, không `1248`), KPI từ DB, time series 8 điểm, không phải danh sách cứng, sự kiện >24h bị loại.

### Step 6 — Test system + prediction routes
33 test: `/health` OK và DB lỗi; `/system/status` `no_data`/`active`/`inactive`/`failed`, tổng sự kiện, DB lỗi; `/predictions`/`/classifications` rỗng, mới nhất, tổng xác suất = 1, DB lỗi; `/analysis/*` (4 route) rỗng/DB lỗi, correlation, temporal nhận tên seeder, trend map metric, seasonality map components, tham số sai; `/clusters` rỗng, chuẩn hóa trường, DB lỗi.

### Step 7 — Test SSE
11 test: gói chào mừng, heartbeat định kỳ, `earthquake_detected` không alert, `earthquake_alert` M ≥ 4.5, `ingestion_cycle_completed`, `database_cleared` khi tổng về 0, DB lỗi không phát cleared, DB lỗi rồi rỗng vẫn báo đúng 1 lần, gói tin đúng hợp đồng + timestamp `Z`, broadcast, cả hai đường dẫn SSE đã đăng ký.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có migration. Không đổi API. Có thể cần thêm cấu hình ruff `extend-immutable-calls` cho `Depends`/`Query` (ghi nhận, không bắt buộc).

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] **Đã tạo đặc tả testcase** tại `.agents/notes/testcase/2026-11-12-offline-test-suite-tai.md`
- [x] **Đã tạo và chạy pass file unit test offline** (7 tệp trong `apps/api/tests/unit/`)
- [x] Backend test liên quan: `uv run pytest tests/unit -q` → 123 passed
- [x] Backend lint/format: `ruff check tests/unit` đạt; `ruff format --check tests/unit` 7 files already formatted
- [ ] Frontend typecheck & build: N/A
- [ ] Notes check (`notes_index.py --check`): chạy khi hoàn tất bộ tài liệu
- [x] Tài liệu bị ảnh hưởng: N/A (không đổi schema/API)
- [x] Kiểm chứng chức năng: cố ý phá code (bỏ điều kiện bỏ qua chu kỳ SSE, đổi ngưỡng M≥5.0) → test bắt được; đã trả code về như cũ

---

## 6. Rủi ro khi làm
- SQLite không chạy `func.timezone` — đã kiểm thủ công trên DB thật.
- Test SSE phụ thuộc `asyncio` — dùng `FakeRequest` + `POLL_INTERVAL_SECONDS = 0`.

---

## 7. Rollback
Xóa 7 tệp test và `conftest.py`. Không ảnh hưởng code sản phẩm.

---

## 8. Ghi chú
- Test offline 100%, không cần PostgreSQL/USGS.
- Fixture ARIMA nhỏ thay model thật → test không phụ thuộc `.joblib`.
- `B008` ở code sản phẩm là quy tắc chung của repo.