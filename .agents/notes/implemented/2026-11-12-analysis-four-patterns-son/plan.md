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
`time_series` × {`day`,`week`,`month`}, `trend` × {`day`|`week`|`month`}, `seasonality` × {`month`|`day`|`none`}, `correlation` × `day`.

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
