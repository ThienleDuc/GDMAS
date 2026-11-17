# BUG-son-003: Số nguyên vượt miền float làm thất bại cả batch

- **Status:** fixed
- **Severity:** medium
- **Area:** apps/api/src/gdmas/services/ingestion/parser.py — T2
- **Reported:** 2026-11-13 — project-review và test hồi quy offline
- **Fixed:** 2026-11-13 — nhánh feat/2026-11-12-ingestion-upsert-validation-son; đã kiểm chứng 77 test pass
- **Related:** .agents/notes/proposed/2026-11-12-ingestion-upsert-validation-son.md; .agents/notes/testcase/2026-11-12-ingestion-upsert-validation-son.md
- **Duplicate of:** -   <!-- chỉ điền BUG-<handle>-NNN khi status là `duplicate` -->

## Triệu chứng
mag = 10**400 gây OverflowError; execute_cycle trả FAILED thay vì tiếp tục nạp feature hợp lệ.

## Tái hiện
1. Gọi parse_features với feature hợp lệ, feature có mag = 10**400 và một feature hợp lệ khác.
2. Chạy test hồi quy trước và sau sửa.

Mong đợi: Giữ hai feature hợp lệ, skipped_invalid bằng 1, không ném ngoại lệ.
Thực tế trước sửa: mag = 10**400 gây OverflowError; execute_cycle trả FAILED thay vì tiếp tục nạp feature hợp lệ.

## Nguyên nhân gốc
to_finite_float chỉ bắt TypeError và ValueError; phép ép float của số nguyên quá lớn ném OverflowError.

## Cách sửa
Bắt thêm OverflowError ở hàm ép số chung cho magnitude, tọa độ, độ sâu và thời gian. Tệp sửa: `apps/api/src/gdmas/services/ingestion/parser.py`.

## Kiểm chứng
Test hồi quy: `test_oversized_numbers_skip_only_the_invalid_feature; test_oversized_optional_updated_timestamp_is_missing; test_invalid_revisions_do_not_reach_upsert_or_fail_the_cycle`.

Trước sửa: bộ parser/service có 17 failed, 52 passed. Sau sửa: cả 3 tệp ingestion có 77 passed; HTTP/DB được mock.

Lệnh: `cd apps/api && .venv/Scripts/python.exe -X utf8 -m pytest tests/unit -q -p no:cacheprovider -o asyncio_default_fixture_loop_scope=function`.

## Lịch sử
- 2026-11-13 — tái hiện finding bằng test hồi quy.
- 2026-11-13 — đã sửa và kiểm chứng offline (status: fixed).
