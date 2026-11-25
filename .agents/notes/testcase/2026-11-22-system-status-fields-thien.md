# Testcase: Field hệ thống (GAP-12)

## Metadata
- ID: 2026-11-22-system-status-fields-thien
- Mode: single-file-test
- Proposal: none
- Target: apps/api/src/gdmas/api/routes/system.py
- Test File: apps/api/tests/unit/test_system_prediction_routes.py
- Author: agent | thien
- Created: 2026-11-22
- Status: passed
- Related Bugs: none

---

## 1/2. Mục tiêu & Fixtures
- `/system/status` có `generated_at` UTC Z, mỗi worker có `records_processed`/`error_message` (None khi chưa có run); `/health` có `uptime_seconds >= 0`.
- Fixture: `ServiceRun` có `records_processed`, `error_message`.

## 3. Ma trận
| TC | Tên | Kết quả | Status |
|---|---|---|---|
| TC-01 | generated_at | ISO 8601 Z | PASS |
| TC-02 | Worker field | records_processed/error_message đúng | PASS |
| TC-03 | Chưa có run | Cả 2 = None, status unknown | PASS |
| TC-04 | health uptime | >= 0 | PASS |

## 4. Lệnh
`cd apps/api && uv run pytest tests/unit/test_system_prediction_routes.py && uv run pytest`, ruff.
Kết quả: targeted 36/36 PASS; full BE 318/318; ruff sạch; FE 217/217 + build PASS.

## 5. Bug Logs
- none
