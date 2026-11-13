# Implementation Plan: Động cơ phân tích 4 Patterns chuỗi thời gian thật cho Terminal 3 (Analysis Worker)

## Metadata
- ID: 2026-11-12-analysis-four-patterns-son
- Proposal: .agents/notes/proposed/2026-11-12-analysis-four-patterns-son.md
- Approved By: son
- Approved At: 2026-11-12
- Implementer: agent | son
- Status: validation

---

## 1. Mục tiêu
Terminal 3 tính Pattern 1–4 từ `earthquake_events` thật mỗi chu kỳ, ghi snapshot `analysis_results` + `service_runs`,
không sinh số liệu giả khi DB rỗng/thưa, và hỗ trợ `--once` để chạy ngay 1 chu kỳ khi Demo.

---

## 2. Phạm vi
### In Scope
- `apps/api/src/gdmas/services/analysis/patterns.py` *(mới — hàm thuần tính Pattern 1–4)*
- `apps/api/src/gdmas/services/analysis/service.py` *(mới — `AnalysisService.execute_cycle`)*
- `apps/api/src/gdmas/services/analysis/runner.py` *(sửa — thêm `--once`, giữ `run()` và lệnh `python -m`)*
- `apps/api/tests/conftest.py` *(giống hệt nhánh `feat/2026-11-12-ingestion-upsert-validation-son` — thêm `src/` vào `sys.path`)*
- `.agents/notes/proposed/2026-11-12-analysis-four-patterns-son.md`
- `.agents/notes/implemented/2026-11-12-analysis-four-patterns-son/plan.md`
- `.agents/notes/implemented/2026-11-12-analysis-four-patterns-son/status.md`
- `.agents/notes/testcase/2026-11-12-analysis-four-patterns-son.md` *(đặc tả testcase)*
- `apps/api/tests/unit/test_analysis_patterns.py`
- `apps/api/tests/unit/test_analysis_service.py`
- `apps/api/tests/unit/test_analysis_runner.py`
- `apps/api/tests/integration/test_analysis_transactions.py` *(DB SQLite tạm trong bộ nhớ, kiểm giao dịch service/ORM thật offline)*
- `apps/api/tests/integration/test_ingestion_pipeline.py` *(HTTP giả lập, chạy parser/upsert thật với session ghi nhận SQL)*
- `docs/architecture/SAD.md` *(cấu trúc Analysis và quy ước snapshot)*
- `docs/workflow.md` *(CLI --once và xử lý kỳ dở dang)*
- `docs/task/son.md` *(đánh dấu tiến độ thực tế của từng task)*
- `.agents/notes/bugs/BUG-son-004-ngay-chua-tron.md`
- `.agents/notes/bugs/BUG-son-005-interval-mua-vu.md`
### Out of Scope
- `apps/api/src/gdmas/api/routes/patterns.py`, `apps/api/src/gdmas/services/demo_seeder.py`, `apps/api/src/gdmas/main.py`
- Pattern 5–6 (`prediction/`), clustering (`clustering/`), `apps/api/alembic/**`, `contracts/**`, `apps/web/**`

---

## 3. Các bước
### Step 1 — `patterns.py`
`prepare_events`, `compute_temporal` (day/week/month), `choose_trend_interval`, `compute_trend`, `compute_seasonality`,
`compute_correlation`, `sanitize_for_json`, `build_analysis_snapshot`.
### Step 2 — `service.py`
`AnalysisService.execute_cycle()`: `ServiceRun` RUNNING → đọc sự kiện cửa sổ 365 ngày → snapshot → xóa `analysis_results` cũ + chèn mới
trong 1 transaction → SUCCESS/FAILED.
### Step 3 — `runner.py`
`execute_cycle()`, `main(argv)` với `--once`, `run(interval=None)` dùng `ANALYSIS_INTERVAL_SECONDS`.
### Step 4 — Test offline & testcase

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có migration/endpoint mới. Quy ước ghi `analysis_results`:
`time_series` × {`day`,`week`,`month`}, `trend` × {`day`|`week`|`month`}, `seasonality` × {`month`|`day`}, `correlation` × `day`. Khi chưa đủ dữ liệu mùa vụ, ghi `time_interval=day` và giữ `status=insufficient_data`, `interval=null` trong metrics.

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] **Đã tạo đặc tả testcase** tại `.agents/notes/testcase/2026-11-12-analysis-four-patterns-son.md`
- [x] **Đã tạo và chạy pass file unit test offline** (3 file `tests/unit/test_analysis_*.py`)
- [x] Backend test: `cd apps/api && uv run pytest tests/unit -q`
- [x] Backend lint/format trên các file đụng tới: `uv run ruff check <files> && uv run ruff format --check <files>`
- [x] Kiểm tra nhất quán notes: `python3 scripts/notes_index.py --check`
- [x] `json.dumps(metrics, allow_nan=False)` thành công với 0, 1 và nhiều sự kiện
- [x] `python -m gdmas.services.analysis.runner --help` hiển thị `--once`

---

## 6. Rủi ro khi làm
- Không có PostgreSQL thật → service kiểm bằng fake session; chạy `--once` trên Docker T1 là bước thủ công.
- `demo_seeder` cũng ghi `analysis_results` → T3 ghi đè snapshot ở chu kỳ kế (đã nêu trong proposal).

---

## 7. Rollback
Revert PR (2 tệp mới + sửa `runner.py`, không migration).

---

## 8. Ghi chú
Nhãn kỳ re-sampling theo ngày bắt đầu kỳ (`MS`, `W-MON`, `D`) — cùng cách gom như `1ME`/`1W`, chỉ khác nhãn.

### Tiếp tục ngày 2026-11-13
- Người dùng yêu cầu kiểm tra task list và tiếp tục sau khi Ingestion đã merge; tiếp tục đúng proposal Analysis đã Approved.
- Bổ sung tham số tùy chọn `as_of` cho các hàm tính kỳ đầy đủ, Trend/Seasonality và snapshot; service truyền thời điểm bắt đầu chu kỳ UTC. Không thay chữ ký bắt buộc cũ, không dùng đồng hồ ngầm trong hàm thuần.
- Loại kỳ chứa `as_of` nếu chưa kết thúc khỏi hồi quy/phân rã; giữ số liệu Temporal và series thực tế, gắn `is_complete=false`.
- Kiểm tra tích hợp giao dịch bằng SQLite tạm với type variant chỉ trong test; không sửa model/migration. Kiểm tra pipeline Ingestion bằng MockTransport và session ghi nhận SQL PostgreSQL, không giả lập lại thuật toán upsert.
- Chạy toàn bộ pytest offline, lint/format trên tệp thay đổi và ghi rõ lỗi nền ngoài scope nếu còn; không dọn hàng loạt mã của thành viên khác.
