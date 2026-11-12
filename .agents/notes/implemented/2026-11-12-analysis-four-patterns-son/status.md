# Implementation Status: Động cơ phân tích 4 Patterns chuỗi thời gian thật cho Terminal 3 (Analysis Worker)

## Metadata
- ID: 2026-11-12-analysis-four-patterns-son
- Status: validation
- Started: 2026-11-12
- Last Updated: 2026-11-12
- Owner: agent | son

---

## Tiến độ
Progress: 90%
Current Phase: Validation xong — chờ PR / kiểm tra conflict & merge

Completed:
- Step 1 — `patterns.py`: Pattern 1 (line/scatter/histogram × day/week/month), Pattern 2 (re-sampling + MA + linregress), Pattern 3 (`seasonal_decompose`, chu kỳ năm/tuần, P-03), Pattern 4 (Pearson + Spearman, chống phương sai 0), `sanitize_for_json`, `build_analysis_snapshot`
- Step 2 — `service.py`: `AnalysisService.execute_cycle` (ServiceRun RUNNING → SUCCESS/FAILED, thay snapshot trong 1 transaction, DB rỗng không chèn số giả)
- Step 3 — `runner.py`: `--once`, `execute_cycle()`, `main(argv)`, `run(interval=None)` dùng `ANALYSIS_INTERVAL_SECONDS`
- Step 4 — 36 unit test offline pass
In Progress:
- review-pr Phần B
Blocked:
- none

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test (`.agents/notes/testcase/` + `test_*.py`) | DONE | `testcase/2026-11-12-analysis-four-patterns-son.md` + 3 file `tests/unit/test_analysis_*.py` |
| Test liên quan (`pytest`) | PASS | `cd apps/api && uv run pytest tests/unit -q -W error::FutureWarning` → 36 passed |
| Lint / Build (`ruff`) | PASS (trên file đã đụng) | ruff toàn repo vốn đỏ sẵn ở `develop` — ngoài phạm vi |
| Notes check (`notes_index.py --check`) | PASS | |
| Tài liệu cập nhật | N/A | Architecture Impact: none |

---

## Known Issues
- Chưa chạy `python -m gdmas.services.analysis.runner --once` trên PostgreSQL thật (máy dev không có container T1 đang chạy); `_load_events` và lệnh xóa/chèn snapshot mới kiểm qua fake session.

---

## Deviations From Plan
- Ngưỡng chọn mức re-sampling cho Trend: proposal ghi "≥ 60 ngày → tháng, ≥ 7 ngày → tuần". Thực tế: ≥ 180 ngày → tháng, ≥ 28 ngày → tuần, còn lại → ngày. Lý do: ngưỡng cũ chỉ cho 2–3 kỳ tháng (có kỳ dở dang) — không đủ để hồi quy. Dữ liệu < 7 ngày vẫn rơi về mức ngày đúng `docs/workflow.md` §7.
- Bổ sung loại kỳ dở dang ở hai đầu (vd. tháng/tuần hiện tại) khỏi hồi quy Trend và phân rã mùa vụ (`complete_period_mask`, cờ `is_complete` trong `series`). Lý do: feed USGS luôn đang ở giữa kỳ hiện tại → kỳ cuối luôn thấp, làm xu hướng bị kéo xuống giả tạo.
- `apps/api/tests/conftest.py` giống hệt (cùng blob `e383e5a`) nhánh `feat/2026-11-12-ingestion-upsert-validation-son` để pytest import được `gdmas`; merge 2 nhánh không xung đột.

---

## Decisions Made During Implementation
- Nhãn kỳ theo ngày bắt đầu (`D`, `W-MON`, `MS`); `resample_freq` báo `D`/`W`/`M` như API.md.
- Ngưỡng diễn giải mùa vụ: ≥ 0.64 rõ rệt, ≥ 0.4 trung bình, còn lại yếu (dữ liệu ngẫu nhiên cho ~0.3).
- `seasonal_factor = 1 + seasonal_effect / mức trung bình` để cùng thang với ví dụ API.md (≈ 1.0); kèm `seasonal_effect` gốc.
- Pattern thiếu dữ liệu (1–2 sự kiện) vẫn ghi bản ghi với `status: insufficient_data` và giá trị `null`, không có số giả.
- Bổ sung khóa tương thích cho `StatisticsPage`: `data_points`, `avg_depth`, `slope`, `direction`, `cycle_hours`, `amplitude`, `corr_mag_depth`, `correlation_strength`.

---

## Next Actions
- review-pr Phần B: scope → project-review → commit → update → push → kiểm 0 conflict.
- Sau merge: chạy `--once` trên Docker T1 rồi gọi `GET /api/v1/patterns` để xác nhận.

---

## Last Update
2026-11-12 — Hoàn tất code + test, chuyển `validation`.
