<!-- Template cho .agents/notes/implemented/yyyy-mm-dd-<slug>-<handle>/status.md — ngắn, sống, cập nhật liên tục.
     Vòng đời: planned → in_progress ⇄ blocked → validation → completed. -->

# Implementation Status: Đồng bộ Pattern 2 (Trend) giữa T3 và T6 theo tần suất re-sampling và metric

## Metadata
- ID: 2026-11-20-trend-resample-metric-son
- Status: validation   <!-- planned | in_progress | blocked | validation | completed -->
- Started: 2026-11-20
- Last Updated: 2026-11-20
- Owner: son

---

## Tiến độ
Progress: 90%
Current Phase: CHECKPOINT 1 — chờ người dùng quyết định commit/push

Completed:
- Nhánh `fix/2026-11-20-trend-resample-metric-son`, bug note `BUG-son-008`, proposal (§9 Approved bởi son)
- Step 1 — `compute_trend(..., metric=)` cho `count`/`avg_magnitude`/`max_magnitude`
- Step 2 — `compute_trend_bundle()` + `build_analysis_snapshot()` ghi trend `day`/`week`/`month` (tần suất chính trước)
- Step 3 — route `/analysis/trend`: `D|W|M`, `strict_interval`, chọn chuỗi theo metric, trả `status`
- Step 4 — 2 file test mới (23 test), cập nhật kỳ vọng 4 test cũ + fixture OpenAPI, cập nhật `docs/api/API.md`
In Progress:
- none
Blocked:
- none

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test (`.agents/notes/testcase/` + `test_*.py`) | DONE | `testcase/2026-11-20-trend-resample-metric-son.md`; `test_analysis_trend_metrics.py`, `test_analysis_trend_route.py` |
| Test liên quan (`pytest`) | PASS | Toàn bộ backend 296 passed (273 cũ + 23 mới); route test trên code cũ 8 failed — tái hiện bug |
| Lint / Build (`ruff` / `pnpm build`) | PASS | `ruff check .` + `ruff format --check .` sạch; không đụng FE |
| Notes check (`notes_index.py --check`) | PASS | |
| Tài liệu cập nhật | DONE | `docs/api/API.md` mục Pattern 2 |

---

## Known Issues
- none   <!-- BUG-son-008 đã sửa trên nhánh này -->

---

## Deviations From Plan
- Dự kiến: chỉ chỉnh kỳ vọng test cũ ở `test_analysis_patterns.py`, `test_analysis_service.py`.
  Thực tế: thêm `tests/integration/test_analysis_transactions.py` (6 → 8 bản ghi) và `tests/fixtures/quality_contracts.json`
  (snapshot OpenAPI: `resample_freq` pattern `^(W|M)$` → `^(D|W|M)$`).
  Lý do: hai nơi này khẳng định đúng số bản ghi snapshot / đúng OpenAPI — thay đổi là chủ ý của proposal.
  Quyết định: cập nhật kỳ vọng, không xóa/tắt test (I7).

---

## Decisions Made During Implementation
- Không cần bảng ánh xạ `INTERVAL_TO_FREQ`: với `strict_interval=True` bản ghi trả về luôn đúng tần suất yêu cầu nên nhãn `resample_freq` lặp lại tham số là chính xác.
- Bản `trend` chỉ có `series` của metric khác (dữ liệu T3 trước nâng cấp) → `series: []`, `status: insufficient_data` thay vì gắn nhãn sai; chu kỳ T3 kế tiếp ghi đủ.
- Định dạng `trend_line` cũ của `demo_seeder` giữ nguyên đường đọc (test cũ của `tai` vẫn pass).
- Máy local không có `uv` trên PATH → chạy bằng `apps/api/.venv/Scripts/python.exe -m pytest|ruff` (cùng môi trường `uv.lock`).

---

## Next Actions
- CHECKPOINT 1: chờ `tiếp tục workflow` → `review-pr` Phần B1 (scope, project-review, commit, update, push, PR — ghi chủ vùng `tai`).

---

## Last Update
2026-11-20 — Hoàn tất code + test, validation xanh, dừng CHECKPOINT 1.
