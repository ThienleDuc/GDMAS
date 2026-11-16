# BUG-son-002: Độ sâu sai định dạng bị đổi thành 0.0

- **Status:** fixed
- **Severity:** medium
- **Area:** apps/api/src/gdmas/services/ingestion/parser.py — T2
- **Reported:** 2026-11-13 — project-review và test hồi quy offline
- **Fixed:** 2026-11-13 — nhánh feat/2026-11-12-ingestion-upsert-validation-son; đã kiểm chứng 77 test pass
- **Related:** .agents/notes/proposed/2026-11-12-ingestion-upsert-validation-son.md; .agents/notes/testcase/2026-11-12-ingestion-upsert-validation-son.md
- **Duplicate of:** -   <!-- chỉ điền BUG-<handle>-NNN khi status là `duplicate` -->

## Triệu chứng
Độ sâu bad, bool, None, NaN hoặc inf được nhận thành 0.0; bản cập nhật có thể ghi đè độ sâu đúng.

## Tái hiện
1. Truyền coordinates = [142.0, 38.0, 'bad'] cho parse_feature.
2. Chạy test hồi quy trước và sau sửa.

Mong đợi: Loại feature; chỉ dùng 0.0 khi không có phần tử độ sâu.
Thực tế trước sửa: Độ sâu bad, bool, None, NaN hoặc inf được nhận thành 0.0; bản cập nhật có thể ghi đè độ sâu đúng.

## Nguyên nhân gốc
parser.py dùng chung giá trị mặc định cho trường hợp thiếu độ sâu và độ sâu không hợp lệ.

## Cách sửa
Tách nhánh thiếu độ sâu khỏi nhánh đã cung cấp; loại giá trị không phải số hữu hạn. Tệp sửa: `apps/api/src/gdmas/services/ingestion/parser.py`.

## Kiểm chứng
Test hồi quy: `test_invalid_supplied_depth_is_rejected; test_finite_supplied_depth_is_preserved; test_invalid_revisions_do_not_reach_upsert_or_fail_the_cycle`.

Trước sửa: bộ parser/service có 17 failed, 52 passed. Sau sửa: cả 3 tệp ingestion có 77 passed; HTTP/DB được mock.

Lệnh: `cd apps/api && .venv/Scripts/python.exe -X utf8 -m pytest tests/unit -q -p no:cacheprovider -o asyncio_default_fixture_loop_scope=function`.

## Lịch sử
- 2026-11-13 — tái hiện finding bằng test hồi quy.
- 2026-11-13 — đã sửa và kiểm chứng offline (status: fixed).
