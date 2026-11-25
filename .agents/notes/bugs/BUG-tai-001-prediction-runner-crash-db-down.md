# BUG-tai-001: Terminal 5 crash khi Postgres tắt vì commit ServiceRun nằm ngoài try

- **Status:** fixed
- **Severity:** high
- **Area:** apps/api/src/gdmas/services/prediction/service.py; runner.py — Terminal T5
- **Reported:** 2026-11-18 — code review vòng 1 (son), `test_other_workers_still_stop_cleanly[prediction.runner]`
- **Fixed:** 2026-11-18 — PR #25 nhánh `fix/tai-review-feedback` (review vòng 2 xác nhận test pass; vòng dọn V2-7 ghi `FAILED` khi lỗi query)
- **Related:** .agents/notes/proposed/2026-11-12-seismic-prediction-worker-tai.md; .agents/notes/testcase/2026-11-12-seismic-prediction-worker-tai.md; PR #25
- **Duplicate of:** -

## Triệu chứng
Khi Postgres tắt, Terminal 5 thoát hẳn thay vì ngủ rồi chạy chu kỳ tiếp. `test_other_workers_still_stop_cleanly[prediction.runner]` fail vì `db.add(run); db.commit()` nằm ngoài `try` và `runner.run()` chỉ bắt `KeyboardInterrupt`/`SystemExit`.

## Tái hiện
1. Tắt Postgres (hoặc để `SessionLocal` mở socket `localhost:5432` rồi đóng cổng).
2. Chạy `python -m gdmas.services.prediction.runner` hoặc pytest `test_other_workers_still_stop_cleanly[prediction.runner]`.

Mong đợi: runner in lỗi, sleep, không thoát tiến trình.
Thực tế (trước sửa): traceback SQLAlchemy, process chết.

## Nguyên nhân gốc
`PredictionService.execute_cycle` gọi `db.commit()` tạo `ServiceRun(RUNNING)` ngoài khối `try`. `runner.run()` không bắt `Exception` nên lỗi kết nối lan ra ngoài vòng lặp.

Sau vòng 2: khối `except SQLAlchemyError: raise` bên trong nuốt luôn lỗi query khi DB còn sống, nên `service_runs` giữ `RUNNING` mãi, `/system/status` sai.

## Cách sửa
Bọc toàn bộ `with SessionLocal()` trong `try/except SQLAlchemyError`, trả `DATABASE_ERROR` thay vì crash. `runner.run()` bắt `Exception` rồi sleep tiếp.

Trong nhánh `except SQLAlchemyError` bên trong: `db.rollback()`, ghi `run.status = "FAILED"`, `error_message = "DATABASE_ERROR"`, rồi `raise` ra handler ngoài.

Test worker mock `PredictionService` để không mở socket Postgres (I7).

## Kiểm chứng
- `test_other_workers_still_stop_cleanly[prediction.runner]` pass, không chờ connect_timeout.
- `test_execute_cycle_marks_failed_on_query_error` ghi `FAILED` khi `_predict` ném `OperationalError`.
- `cd apps/api && uv run pytest` (Postgres tắt).

## Lịch sử
- 2026-11-18 — ghi nhận từ review vòng 1 (status: open)
- 2026-11-18 — đã sửa crash; review vòng 2 pass 272 test
- 2026-11-18 — bổ sung ghi FAILED khi lỗi query + mock DB trong test worker (status: fixed)
