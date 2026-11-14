# Implementation Plan: Hoàn thiện các Endpoint REST API (Terminal 6)

## Metadata
- ID: 2026-11-12-api-rest-endpoints-tai
- Proposal: .agents/notes/proposed/2026-11-12-api-rest-endpoints-tai.md
- Approved By: tai
- Approved At: 2026-11-14
- Implementer: agent | tai
- Status: completed

---

## 1. Mục tiêu
Bổ sung các endpoint REST còn thiếu so với `API.md` §3 cho màn hình giám sát, StatisticsPage và MonitoringMapPage; mở rộng bộ lọc `/earthquakes`; chuẩn hóa Envelope lỗi.

---

## 2. Phạm vi
### In Scope
- `apps/api/src/gdmas/api/routes/system.py` *(mới)*
- `apps/api/src/gdmas/api/routes/predictions.py` *(mới)*
- `apps/api/src/gdmas/api/routes/analysis.py` *(mới)*
- `apps/api/src/gdmas/api/routes/clusters.py` *(mới)*
- `apps/api/src/gdmas/api/routes/earthquakes.py` *(sửa: thêm bộ lọc thời gian + bounding box)*
- `apps/api/src/gdmas/api/router.py` *(sửa: đăng ký 4 router mới)*
- `.agents/notes/testcase/2026-11-12-api-rest-endpoints-tai.md`
- `apps/api/tests/unit/test_system_prediction_routes.py`
### Out of Scope
- `/statistics/earthquakes`, SSE, `/events/stream` (Task 3).
- `demo_seeder.py`, ORM, migration, `main.py`, `contracts/`, `apps/web/`.
- Ép định dạng `metrics_data` của analysis.

---

## 3. Các bước
### Step 1 — System endpoints
`system.py`: `GET /health` (`SELECT 1`), `GET /system/status` (đọc `service_runs` mới nhất cho `ingestion/analysis/clustering/prediction`, `_worker_status` trả `active` nếu chạy trong 2 chu kỳ, `inactive` nếu lâu hơn, `failed` nếu lần gần nhất FAILED, `no_data` nếu chưa chạy; thêm `api`, `frontend`; kèm `data_feed`).

### Step 2 — Prediction endpoints
`predictions.py`: `_empty` dùng chung; `/predictions` và `/classifications` lấy bản ghi mới nhất theo `target_date`, `id`, trả `confidence_interval`, `probabilities`, `actual_value`/`actual_label`, `evaluation_metrics`, `generated_at`.

### Step 3 — Analysis endpoints
`analysis.py`: `_latest` lọc theo `analysis_type` (chấp nhận alias `temporal`/`time_series`), `time_interval` (chấp nhận `day`/`daily`/`hourly`...), `period_start`/`period_end`; `/temporal`, `/trend`, `/seasonality`, `/correlation` chuẩn hóa từ `metrics_data` (nhận cả tên seeder) về dạng `API.md`; lỗi tham số → 400/422.

### Step 4 — Clusters
`clusters.py`: `_cluster` chuẩn hóa `id/lat/lon/events_count/avg_mag` → `cluster_id/center_latitude/center_longitude/event_count/avg_magnitude`; trả `algorithm`, `parameters`, `clusters_count`, `noise_count`, danh sách cụm.

### Step 5 — Bộ lọc `/earthquakes`
`earthquakes.py`: thêm `start_time`, `end_time` (ISO 8601, thiếu múi giờ coi là UTC), `min_lat`, `max_lat`, `min_lon`, `max_lon`; `_validation_error` trả 400 `VALIDATION_ERROR` khi `min > max` hoặc thời gian đảo ngược.

### Step 6 — Đăng ký router
`router.py`: include `system`, `predictions`, `analysis`, `clusters`.

### Step 7 — Test offline
`test_system_prediction_routes.py` (33 test): `/health`, `/system/status`, `/predictions`, `/classifications`, `/analysis/*`, `/clusters`; DB rỗng, có dữ liệu, DB lỗi.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có Alembic migration mới. Endpoint mới theo `API.md` §3. Cần đối chiếu `API.md` §3 và code sau khi `son` chốt định dạng analysis.

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] **Đã tạo đặc tả testcase** tại `.agents/notes/testcase/2026-11-12-api-rest-endpoints-tai.md`
- [x] **Đã tạo và chạy pass file unit test offline** (`apps/api/tests/unit/test_system_prediction_routes.py`)
- [x] Backend test liên quan: `uv run pytest tests/unit -q` → 123 passed (gồm cả Task 1)
- [x] Backend lint/format: `uv run ruff check tests/unit` + `format --check` đạt; `ruff check src/gdmas/api` còn `B008` là quy tắc chung của repo
- [ ] Frontend typecheck & build: N/A
- [ ] Notes check (`notes_index.py --check`): chạy khi hoàn tất bộ tài liệu
- [x] Tài liệu bị ảnh hưởng: cần đối chiếu `API.md` §3 (drift)
- [x] Kiểm chứng chức năng: `/health`, `/system/status`, `/predictions`, `/classifications` trả đúng; `/earthquakes?min_magnitude=7&max_magnitude=3` trả 400 `VALIDATION_ERROR`; `/earthquakes?min_lat=-30&max_lat=0&min_magnitude=4` trả danh sách

---

## 6. Rủi ro khi làm
- `metrics_data` thiếu `line_chart`/`trend_value` → ghi nhận, chờ `son`.
- `B008` do repo chưa khai báo `Depends`/`Query` là immutable calls → đề xuất nhóm thêm `[tool.ruff.lint.flake8-bugbear] extend-immutable-calls`.

---

## 7. Rollback
Revert PR nhánh `feature/task2-rest-endpoints`. Không có migration. Các router cũ vẫn chạy nếu bỏ 4 dòng `include_router` mới.

---

## 8. Ghi chú
- `Query` mới đều tùy chọn; mặc định giữ hành vi cũ.
- Route analysis/clusters trả `success: false` + `data: null` khi bảng rỗng (khớp `/patterns`).
- Báo `thien` về Envelope lỗi mới cho `/earthquakes`.