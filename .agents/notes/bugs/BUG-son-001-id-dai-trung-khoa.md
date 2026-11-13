# BUG-son-001: ID dài bị cắt gây trùng khóa sự kiện

- **Status:** fixed
- **Severity:** high
- **Area:** apps/api/src/gdmas/services/ingestion/parser.py — T2
- **Reported:** 2026-11-13 — project-review và test hồi quy offline
- **Fixed:** 2026-11-13 — nhánh feat/2026-11-12-ingestion-upsert-validation-son; đã kiểm chứng 77 test pass
- **Related:** .agents/notes/proposed/2026-11-12-ingestion-upsert-validation-son.md; .agents/notes/testcase/2026-11-12-ingestion-upsert-validation-son.md
- **Duplicate of:** -   <!-- chỉ điền BUG-<handle>-NNN khi status là `duplicate` -->

## Triệu chứng
Hai ID khác nhau sau ký tự 64 trở thành cùng khóa upsert; deduplicate chỉ giữ một dòng.

## Tái hiện
1. Truyền ID gồm 64 ký tự x, ID đó nối a và ID đó nối b cho parse_features.
2. Chạy test hồi quy trước và sau sửa.

Mong đợi: Chỉ giữ ID 64 ký tự, loại hai ID quá dài; skipped_invalid bằng 2.
Thực tế trước sửa: Hai ID khác nhau sau ký tự 64 trở thành cùng khóa upsert; deduplicate chỉ giữ một dòng.

## Nguyên nhân gốc
parser.py cắt source_event_id bằng [:64], làm mất tính duy nhất của ID nguồn.

## Cách sửa
Giữ nguyên ID; loại feature vượt giới hạn 64 ký tự thay vì cắt. Tệp sửa: `apps/api/src/gdmas/services/ingestion/parser.py`.

## Kiểm chứng
Test hồi quy: `test_overlong_ids_are_rejected_instead_of_truncated; test_shared_id_prefix_does_not_merge_distinct_events`.

Trước sửa: bộ parser/service có 17 failed, 52 passed. Sau sửa: cả 3 tệp ingestion có 77 passed; HTTP/DB được mock.

Lệnh: `cd apps/api && .venv/Scripts/python.exe -X utf8 -m pytest tests/unit -q -p no:cacheprovider -o asyncio_default_fixture_loop_scope=function`.

## Lịch sử
- 2026-11-13 — tái hiện finding bằng test hồi quy.
- 2026-11-13 — đã sửa và kiểm chứng offline (status: fixed).
