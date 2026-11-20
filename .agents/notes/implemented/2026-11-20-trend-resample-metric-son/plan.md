<!-- Template cho .agents/notes/implemented/yyyy-mm-dd-<slug>-<handle>/plan.md — chỉ tạo sau khi proposal có Decision: Approved ở §9.
     Tầng thực thi, không chép lại lý lẽ của proposal. Luật: docs/agent-workflow.md. -->

# Implementation Plan: Đồng bộ Pattern 2 (Trend) giữa T3 và T6 theo tần suất re-sampling và metric

## Metadata
- ID: 2026-11-20-trend-resample-metric-son
- Proposal: .agents/notes/proposed/2026-11-20-trend-resample-metric-son.md
- Approved By: son
- Approved At: 2026-11-20
- Implementer: agent | son
- Status: validation

---

## 1. Mục tiêu
T3 ghi bản `trend` cho `day`/`week`/`month`, mỗi bản có chuỗi + hồi quy cho `count`/`avg_magnitude`/`max_magnitude`;
route `GET /api/v1/analysis/trend` trả đúng tần suất & metric được yêu cầu (nhận `D|W|M`), không khớp thì Empty State.
Sửa `BUG-son-008`.

---

## 2. Phạm vi
### In Scope
- `apps/api/src/gdmas/services/analysis/patterns.py` — `compute_trend(..., metric="count")`, `compute_trend_bundle()`, `build_analysis_snapshot()`
- `apps/api/src/gdmas/api/routes/analysis.py` — `get_trend()`, `_latest(..., strict_interval=False)`, `INTERVAL_ALIASES["D"]` *(chủ vùng `tai`)*
- `docs/api/API.md` — mục Pattern 2
- `apps/api/tests/unit/test_analysis_patterns.py` — cập nhật `test_snapshot_types_and_intervals` cho 3 bản `trend` (nếu test hiện có khẳng định 1 bản)
- `apps/api/tests/unit/test_analysis_service.py` — cập nhật kỳ vọng danh sách bản ghi snapshot (nếu có)
- `apps/api/tests/integration/test_analysis_transactions.py` — cập nhật số bản ghi snapshot (6 → 8)
- `apps/api/tests/fixtures/quality_contracts.json` — snapshot OpenAPI: `resample_freq` pattern `^(D|W|M)$`
- `.agents/notes/testcase/2026-11-20-trend-resample-metric-son.md` *(đặc tả testcase sinh đồng thời từ `_TEMPLATE.md`)*
- `apps/api/tests/unit/test_analysis_trend_metrics.py` *(mới)*
- `apps/api/tests/unit/test_analysis_trend_route.py` *(mới)*
- `.agents/notes/bugs/BUG-son-008-trend-sai-nhan-tan-suat-metric.md`
- `.agents/notes/proposed/2026-11-20-trend-resample-metric-son.md`, `.agents/notes/implemented/2026-11-20-trend-resample-metric-son/`
### Out of Scope
- `contracts/**`, `apps/api/alembic/**`, `apps/api/src/gdmas/main.py`, `apps/web/**`
- `apps/api/src/gdmas/services/analysis/service.py`, `runner.py` (snapshot vẫn ghi nguyên tử như cũ)
- `apps/api/src/gdmas/api/routes/patterns.py`, Pattern 1/3/4, T4/T5

---

## 3. Các bước
### Step 1 — T3: metric cho `compute_trend`
Thêm `TREND_INTERVALS`, `TREND_METRICS`; `compute_trend(df, interval=None, *, as_of=None, metric="count")`.
`count` giữ nguyên hành vi; `avg_magnitude`/`max_magnitude` dùng mean/max theo kỳ, bỏ kỳ rỗng khỏi chuỗi & hồi quy.
### Step 2 — T3: `compute_trend_bundle` + snapshot
Bundle = kết quả `count` ở cấp cao nhất + `metrics: {metric: {...}}`. `build_analysis_snapshot` ghi bản `trend` tần suất chính
(`choose_trend_interval`) trước, rồi 2 tần suất còn lại.
### Step 3 — T6: route trend
`resample_freq` `^(D|W|M)$`; `_latest(..., strict_interval=True)` cho trend; chọn chuỗi theo `metric`
(`metrics[metric]` → `series` nếu cùng metric → `trend_line` cũ); nhãn phản hồi theo dữ liệu thật; không khớp → `_empty`.
### Step 4 — Test + docs
2 file test mới, chỉnh kỳ vọng test cũ nếu cần (không xóa test), cập nhật `docs/api/API.md`.

---

## 4. Thay đổi dữ liệu / API / cấu hình
- Không migration. `analysis_results` thêm 2 bản `trend` mỗi chu kỳ; `metrics_data` của `trend` có thêm khóa `metrics`.
- API: `/analysis/trend` nhận thêm `resample_freq=D`; phản hồi có `status` khi T3 ghi.

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] **Đã tạo đặc tả testcase** tại `.agents/notes/testcase/2026-11-20-trend-resample-metric-son.md`
- [x] **Đã tạo và chạy pass file unit test offline** (`test_analysis_trend_metrics.py`, `test_analysis_trend_route.py`)
- [x] Backend test toàn bộ: `cd apps/api && uv run pytest`
- [x] Backend lint/format: `cd apps/api && uv run ruff check . && uv run ruff format --check .`
- [x] Kiểm tra nhất quán notes: `python3 scripts/notes_index.py --check`
- [x] `docs/api/API.md` mục Pattern 2 đã cập nhật
- [x] Tái hiện `BUG-son-008` (W/avg_magnitude) cho kết quả đúng tần suất & metric

---

## 6. Rủi ro khi làm
- `/patterns` lấy bản `trend` đầu tiên theo thứ tự chèn → ghi bản tần suất chính trước, có test.
- Test route cũ của `tai` dùng định dạng seeder (`trend_line`, `weekly`) → giữ đường đọc cũ, chạy lại test cũ.

---

## 7. Rollback
Revert commit/PR; không có migration nên không cần `alembic downgrade`. Chu kỳ T3 kế tiếp ghi lại snapshot theo code cũ.

---

## 8. Ghi chú
Ghi chủ vùng `tai` (`routes/analysis.py`) trong mô tả PR.
