# BUG-son-006: Ngắt lúc worker chờ retry thoát bằng traceback

- **Status:** fixed
- **Severity:** medium
- **Area:** apps/api/src/gdmas/api/routes/ và services/ingestion/runner.py
- **Reported:** 2026-11-13 — test ranh giới lỗi đợt 2
- **Fixed:** 2026-11-13 — nhánh fix/2026-11-13-backend-lint-validation-son, 149 test offline pass
- **Related:** .agents/notes/proposed/2026-11-13-backend-lint-validation-son.md; .agents/notes/testcase/2026-11-13-backend-lint-validation-son.md
- **Duplicate of:** -   <!-- chỉ điền BUG-<handle>-NNN khi status là `duplicate` -->

## Triệu chứng
Sau lỗi chu kỳ, KeyboardInterrupt/SystemExit trong time.sleep ở nhánh retry thoát ra ngoài handler, không đi qua thông báo dừng sạch.

## Tái hiện
Giả lập execute_cycle ném RuntimeError, sau đó time.sleep ném KeyboardInterrupt hoặc SystemExit. run() phải trả về sạch, không để ngoại lệ ngắt thoát ra test.

## Nguyên nhân gốc
time.sleep trong except Exception nằm ngoài try của vòng lặp nên handler ngắt của vòng lặp không bắt được.

## Cách sửa
Bổ sung _wait_for_next_cycle dùng chung cho chờ thường/retry; giữ nguyên chữ ký run và chu kỳ chờ.

## Kiểm chứng
Test: `test_retry_wait_handles_interrupt_cleanly; test_worker_retries_without_exposing_credentials`.

Trước sửa: bộ test ranh giới lỗi có 10 failed, 3 passed. Sau sửa: 13 test đó pass; bổ sung 5 trường hợp kiểm lỗi ngoài dự kiến/payload hỏng, toàn backend đạt 149 passed. Ruff check và format toàn backend sạch, 54 tệp.

Lệnh: `cd apps/api && .venv/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider -W error::FutureWarning -o asyncio_default_fixture_loop_scope=function`.

## Lịch sử
- 2026-11-13 — tái hiện qua test offline trước sửa.
- 2026-11-13 — đã sửa, kiểm chứng và ghi fixed.
