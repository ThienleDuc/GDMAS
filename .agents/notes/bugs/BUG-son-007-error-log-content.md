# BUG-son-007: Log biên API và worker ghi nguyên văn ngoại lệ nguồn

- **Status:** fixed
- **Severity:** high
- **Area:** apps/api/src/gdmas/api/routes/ và services/ingestion/runner.py
- **Reported:** 2026-11-13 — test ranh giới lỗi đợt 2
- **Fixed:** 2026-11-13 — nhánh fix/2026-11-13-backend-lint-validation-son, 149 test offline pass
- **Related:** .agents/notes/proposed/2026-11-13-backend-lint-validation-son.md; .agents/notes/testcase/2026-11-13-backend-lint-validation-son.md
- **Duplicate of:** -   <!-- chỉ điền BUG-<handle>-NNN khi status là `duplicate` -->

## Triệu chứng
Khi ngoại lệ chứa URL có credential/query, log/stdout cũ giữ nguyên nội dung đó. Test tái hiện bằng credential giả tại db.invalid, không dùng thông tin đăng nhập thật.

## Tái hiện
Giả lập HTTP/DB/worker ném ngoại lệ chứa postgresql://unit_user:unit_password@db.invalid/test?api_key=unit_token; kiểm log/stdout không chứa các giá trị giả.

## Nguyên nhân gốc
Các handler dùng str(exc) hoặc f-string nguyên văn; một số nhánh DB còn except-pass không có chẩn đoán.

## Cách sửa
API/SSE log ngữ cảnh và tên loại lỗi, chỉ bắt lỗi dự kiến. Worker dùng summarize_error hiện có; catch-all chỉ giữ tại biên Terminal có giải trình và test retry.

## Kiểm chứng
Test: `test_source_error_preserves_sync_response_with_safe_log; test_sse_database_error_preserves_cursor_and_closes_session; test_worker_retries_without_exposing_credentials`.

Trước sửa: bộ test ranh giới lỗi có 10 failed, 3 passed. Sau sửa: 13 test đó pass; bổ sung 5 trường hợp kiểm lỗi ngoài dự kiến/payload hỏng, toàn backend đạt 149 passed. Ruff check và format toàn backend sạch, 54 tệp.

Lệnh: `cd apps/api && .venv/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider -W error::FutureWarning -o asyncio_default_fixture_loop_scope=function`.

## Lịch sử
- 2026-11-13 — tái hiện qua test offline trước sửa.
- 2026-11-13 — đã sửa, kiểm chứng và ghi fixed.
