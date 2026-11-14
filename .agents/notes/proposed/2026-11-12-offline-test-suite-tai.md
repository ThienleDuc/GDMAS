# Proposal: Bộ kiểm thử offline cho Prediction Worker và toàn bộ REST/SSE (Terminal 5 + 6)

## Metadata
- ID: 2026-11-12-offline-test-suite-tai
- Author: agent | tai
- Created: 2026-11-12
- Type: infrastructure
- Status: approved
- Priority: high
- Area: apps/api/tests/unit/
- Architecture Impact: none
  <!-- Chỉ thêm test; không đổi schema, API, contracts hay code sản phẩm.
       Có thể cần thêm cấu hình ruff (extend-immutable-calls) vào apps/api/pyproject.toml
       nếu nhóm muốn B008 sạch — nhưng đây là thay đổi cấu hình chung, ghi nhận, không bắt buộc. -->
- Related Docs:
  - docs/quyuocchung.md
  - docs/coding-rules.md (I7 — unit test offline 100%)
  - docs/task/tai.md (Task 4)
  - docs/yeucaubatbuoc.md (§4 Demo)
  - docs/agent-workflow.md (write-testcase skill)
- Related Proposals:
  - .agents/notes/proposed/2026-11-12-seismic-prediction-worker-tai.md (Task 1; test prediction)
  - .agents/notes/proposed/2026-11-12-api-rest-endpoints-tai.md (Task 2; test route mới)
  - .agents/notes/proposed/2026-11-12-api-empty-db-sse-tai.md (Task 3; test DB rỗng/lỗi/SSE)
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Ba task trước (Prediction Worker, REST endpoint mới, bỏ mock + SSE) đã có code chạy được trên máy phát triển. Task 4 yêu cầu bộ kiểm thử offline để bảo vệ các hành vi quan trọng trước khi Frontend tích hợp và trước Demo §4.

### Vấn đề
Trước Task 4, `apps/api/tests/unit/` chỉ có `__init__.py`. Không có test nào cho:
- Toán học của Pattern 5/6 (`lower ≤ predicted ≤ upper`, tổng xác suất = 1).
- Hành vi DB rỗng (Demo Bước 2–3) và DB lỗi (Demo Bước 3) của các route.
- SSE phát đúng sự kiện và không phát `database_cleared` nhầm khi DB lỗi thoáng qua.

### Ảnh hưởng
Không có test thì không phát hiện được hồi quy khi đồng đội merge code; Demo §4 có nguy cơ hỏng mà không biết trước; tiêu chí "chạy `uv run pytest`" trong `docs/task/tai.md` không đạt.

---

## 2. Hiện trạng
- `apps/api/tests/unit/`: chỉ có `__init__.py`.
- `apps/api/tests/` chưa có `conftest.py` dùng chung.
- Các route và dịch vụ của Task 1–3 đã có; chưa có test bảo vệ.

---

## 3. Mục tiêu
- **Mục tiêu:**
  - Test offline 100% (không cần PostgreSQL, không cần USGS) cho:
    - `inference.py`, `service.py` (Task 1).
    - Các route `/earthquakes`, `/statistics/earthquakes`, `/health`, `/system/status`, `/predictions`, `/classifications`, `/analysis/*`, `/clusters` (Task 2 + 3).
    - Generator SSE và cả hai route SSE (Task 3).
  - Dùng `TestClient` + dependency override `get_db` với SQLite trong bộ nhớ và model ORM thật; session giả `BrokenSession` mô phỏng mất kết nối PostgreSQL.
  - Đạt `uv run pytest tests/unit`, `uv run ruff check tests/unit`, `uv run ruff format --check tests/unit`.
- **Không nằm trong mục tiêu (Out of Scope):**
  - Test tích hợp với PostgreSQL thật / USGS thật.
  - Sửa code sản phẩm (chỉ test; nếu test phát hiện lỗi thì tạo bug trong `.agents/notes/bugs/`).
  - Sửa `demo_seeder.py`, ORM, migration, `main.py`, `contracts/`, `apps/web/`.
  - Test Frontend.

---

## 4. Giải pháp đề xuất
Tuân thủ **I7** (unit test offline 100%), **I2 / RULE-03** (chỉ thêm tệp trong `tests/unit/`), **I3** (dữ liệu mẫu dùng UTC).

**Tệp dự kiến:**
- `apps/api/tests/unit/conftest.py` *(mới)*: fixture dùng chung.
  - `session_factory`: SQLite trong bộ nhớ (`StaticPool`, `check_same_thread=False`), đăng ký hàm `floor` cho SQLite.
  - `@compiles(JSONB, "sqlite")` → `JSON`; `@compiles(BigInteger, "sqlite")` → `INTEGER`.
  - `db`, `client` (override `get_db`), `broken_client` (`BrokenSession` ném `OperationalError` ở mọi thao tác).
  - `add_event(db, n, **overrides)` tạo sự kiện mẫu M4.0 cách đây 1 giờ.
- `apps/api/tests/unit/test_prediction_inference.py` *(mới)*: 28 test cho `build_series`, `forecast_next`, `classify_next`, `label_of_count`, `forecast_model_info`, `classifier_model_info`, `load_artifacts`; fixture tự huấn luyện ARIMA(1,0,0) nhỏ trên chuỗi giả lập.
- `apps/api/tests/unit/test_prediction_service.py` *(mới)*: 16 test cho `_complete_day_counts`, `_fill_actuals`, `_predict`, `execute_cycle`; `FakeSession` thay PostgreSQL.
- `apps/api/tests/unit/test_earthquakes_routes.py` *(mới)*: 29 test cho DB rỗng/lỗi, phân trang, sắp xếp, bộ lọc, 400, 404, `/sync`.
- `apps/api/tests/unit/test_statistics_route.py` *(mới)*: 6 test cho DB rỗng/lỗi, KPI tính từ DB, time series 8 điểm, sự kiện >24h bị loại.
- `apps/api/tests/unit/test_system_prediction_routes.py` *(mới)*: 33 test cho `/health`, `/system/status`, `/predictions`, `/classifications`, `/analysis/*`, `/clusters`.
- `apps/api/tests/unit/test_sse_stream.py` *(mới)*: 11 test cho generator SSE và broadcast.

**Chiến lược:**
- Fixture tự huấn luyện ARIMA nhỏ trên chuỗi giả lập (100 ± 10 trận/ngày) thay vì nạp model thật → test không phụ thuộc file `.joblib`.
- `BrokenSession.__getattr__` ném `OperationalError` → mọi route chạm DB đều rơi vào nhánh `DATABASE_ERROR`.
- SSE test bằng `FakeRequest` ngắt sau `n` lần và `monkeypatch` `get_latest_state` để điều khiển dãy trạng thái.
- Cố ý phá code (ví dụ bỏ điều kiện "bỏ qua chu kỳ khi DB lỗi", đổi ngưỡng M≥5.0) để xác nhận test bắt được lỗi, rồi trả về như cũ.

---

## 5. Phương án đã cân nhắc
### Phương án A: Test tích hợp với PostgreSQL thật (Docker)
Ưu: kiểm được cú pháp PostgreSQL (`func.timezone`, `func.floor`). Nhược: cần Docker, chậm, không offline. Không chọn; đã kiểm thủ công trên DB thật.

### Phương án B: SQLite trong bộ nhớ + model ORM thật (chọn)
Ưu: offline 100%, chạy nhanh (~3 giây cho 123 test), lọc/đếm/phân trang chạy thật. Nhược: không chạy cú pháp PostgreSQL riêng. **Chọn**, ghi nhận hạn chế.

### Phương án C: Dùng `MagicMock` cho toàn bộ session
Ưu: không cần SQLite. Nhược: không kiểm được truy vấn lọc/đếm thật; test dễ pass giả. Không chọn.

### Phương án D: Không viết test, dựa vào kiểm thủ công
Nhược: không đạt tiêu chí Task 4; không phát hiện hồi quy. Không chọn.

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Trung bình | 7 tệp test + `conftest.py` dùng chung |
| Hiệu năng | Thấp | 123 test chạy ~3 giây (offline, SQLite) |
| Bảo trì / Open-Closed | Tốt | Chỉ thêm tệp test; không đụng code sản phẩm |
| Độ tin cậy | Tăng mạnh | Bao phủ DB rỗng/lỗi, toán học Pattern 5/6, SSE |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| 1. SQLite không chạy cú pháp PostgreSQL riêng (`func.timezone`, `func.floor` trong statistics) | Cao | Thấp | Đã đăng ký hàm `floor` cho SQLite; `func.timezone` đã kiểm thủ công trên DB thật |
| 2. Fixture ARIMA nhỏ khác model thật (ARIMA(2,0,1)_log) | Trung bình | Thấp | Test toán học (bất đẳng thức, tổng xác suất) không phụ thuộc tham số model |
| 3. `B008` (`Depends`/`Query` trong default) bị ruff báo | Cao | Thấp | Ghi nhận là quy tắc chung của repo; đề xuất `extend-immutable-calls` cho `Depends`/`Query` |
| 4. Test dễ pass giả nếu chỉ dùng `MagicMock` | Thấp | Trung bình | Đã cố ý phá code để xác nhận test bắt được lỗi |
| 5. Test SSE phụ thuộc `asyncio` + `monkeypatch` | Thấp | Thấp | Dùng `FakeRequest` đơn giản, `POLL_INTERVAL_SECONDS = 0` trong test |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-12-offline-test-suite-tai.md`
- **Code test tự động (offline):**
  - `apps/api/tests/unit/conftest.py`
  - `test_prediction_inference.py` (28), `test_prediction_service.py` (16)
  - `test_earthquakes_routes.py` (29), `test_statistics_route.py` (6)
  - `test_system_prediction_routes.py` (33), `test_sse_stream.py` (11)
- **Cách kiểm chứng:**
  - `cd apps/api && uv run pytest tests/unit -q` → 123 passed.
  - `uv run ruff check tests/unit` → All checks passed!
  - `uv run ruff format --check tests/unit` → 7 files already formatted.
  - Cố ý phá code: bỏ điều kiện "bỏ qua chu kỳ khi DB lỗi" → 2 test SSE báo lỗi; đổi ngưỡng M≥5.0 trong statistics → test KPI báo lỗi. Đã trả code về như cũ.

---

## 9. Human Review
Decision: Approved
Reviewer: tai
Review Date: 2026-11-14
Comments: Tác giả tự duyệt theo docs/agent-workflow.md. 123 test offline đạt; ruff sạch trên `tests/unit`. Hạn chế: SQLite không chạy cú pháp PostgreSQL riêng; đã kiểm thủ công trên DB thật.
Scope of Rejection: -

---

## 10. Next Action
Đã hoàn tất. Còn lại: chạy `notes_index.py --check` khi đủ bộ tài liệu; cân nhắc thêm cấu hình ruff `extend-immutable-calls` cho `Depends`/`Query`; commit/push và mở PR. Xem `implemented/2026-11-12-offline-test-suite-tai/plan.md` và `status.md`.