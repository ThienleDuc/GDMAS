# BUG-son-004: Ngày hiện tại còn dở dang bị coi là kỳ đầy đủ

- **Status:** fixed
- **Severity:** medium
- **Area:** apps/api/src/gdmas/services/analysis/ — T3
- **Reported:** 2026-11-13 — rà soát nhánh Analysis và test hồi quy offline
- **Fixed:** 2026-11-13 — nhánh feat/2026-11-12-analysis-four-patterns-son; kiểm chứng 126 test offline pass
- **Related:** .agents/notes/proposed/2026-11-12-analysis-four-patterns-son.md; .agents/notes/testcase/2026-11-12-analysis-four-patterns-son.md
- **Duplicate of:** -   <!-- chỉ điền BUG-<handle>-NNN khi status là `duplicate` -->

## Triệu chứng
Trend đưa số sự kiện của ngày hiện tại chưa kết thúc vào hồi quy; mùa vụ có thể phân rã khi chưa đủ hai chu kỳ đầy đủ.

## Tái hiện
Tạo 20 ngày có 10 sự kiện/ngày và ngày thứ 21 mới có 1 sự kiện; đặt as_of giữa ngày thứ 21. Kỳ cuối phải is_complete=false, hồi quy giữ slope=0 trên 20 ngày đầy đủ.

## Nguyên nhân gốc
complete_period_mask lấy cuối ngày chứa sự kiện cuối cùng làm biên kết thúc và chưa biết thời điểm quan sát thật của chu kỳ.

## Cách sửa
Bổ sung tham số as_of tùy chọn cho mask, Trend/Seasonality và snapshot; service truyền started_at UTC. Hàm thuần không tự đọc đồng hồ; chữ ký gọi cũ vẫn dùng được.

## Kiểm chứng
Test hồi quy: `test_trend_excludes_current_partial_day_from_regression; test_seasonality_requires_two_complete_cycles_at_as_of; test_day_completes_exactly_at_next_utc_midnight; test_cycle_passes_utc_start_time_to_snapshot`.

Bộ unit Analysis và integration mới trước sửa: 7 failed, 34 passed (gồm lỗi chưa có tham số as_of và time_interval sai). Sau sửa: 126 test offline pass toàn backend. Lệnh: `cd apps/api && .venv/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider -W error::FutureWarning -o asyncio_default_fixture_loop_scope=function`.

## Lịch sử
- 2026-11-13 — ghi nhận và tái hiện trước sửa.
- 2026-11-13 — đã sửa, có test hồi quy và kiểm chứng offline (status: fixed).
