# BUG-son-005: Snapshot mùa vụ thiếu dữ liệu ghi time_interval ngoài quy ước

- **Status:** fixed
- **Severity:** medium
- **Area:** apps/api/src/gdmas/services/analysis/ — T3
- **Reported:** 2026-11-13 — rà soát nhánh Analysis và test hồi quy offline
- **Fixed:** 2026-11-13 — nhánh feat/2026-11-12-analysis-four-patterns-son; kiểm chứng 126 test offline pass
- **Related:** .agents/notes/proposed/2026-11-12-analysis-four-patterns-son.md; .agents/notes/testcase/2026-11-12-analysis-four-patterns-son.md
- **Duplicate of:** -   <!-- chỉ điền BUG-<handle>-NNN khi status là `duplicate` -->

## Triệu chứng
Với 1 sự kiện, snapshot mùa vụ lưu time_interval=none thay vì day/week/month; bộ đọc dùng quy ước chuẩn không tìm được kết quả thiếu dữ liệu.

## Tái hiện
Gọi build_analysis_snapshot với một sự kiện hợp lệ, hoặc chạy AnalysisService trên DB tạm có 1–3 sự kiện. Bản ghi seasonality phải dùng time_interval=day và metrics status=insufficient_data, interval=null.

## Nguyên nhân gốc
build_analysis_snapshot dùng chuỗi none làm giá trị dự phòng khi compute_seasonality chưa xác định được interval.

## Cách sửa
Dùng day làm time_interval của bản ghi mùa vụ chưa đủ dữ liệu; giữ nguyên trạng thái insufficient_data và các chỉ số null, không tạo số liệu giả.

## Kiểm chứng
Test hồi quy: `test_insufficient_seasonality_snapshot_uses_supported_interval; test_cycles_replace_snapshot_and_preserve_raw_events`.

Bộ unit Analysis và integration mới trước sửa: 7 failed, 34 passed (gồm lỗi chưa có tham số as_of và time_interval sai). Sau sửa: 126 test offline pass toàn backend. Lệnh: `cd apps/api && .venv/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider -W error::FutureWarning -o asyncio_default_fixture_loop_scope=function`.

## Lịch sử
- 2026-11-13 — ghi nhận và tái hiện trước sửa.
- 2026-11-13 — đã sửa, có test hồi quy và kiểm chứng offline (status: fixed).
