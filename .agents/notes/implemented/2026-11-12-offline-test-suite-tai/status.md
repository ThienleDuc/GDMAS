# Implementation Status: Bộ kiểm thử offline cho Prediction Worker và REST/SSE

## Metadata
- ID: 2026-11-12-offline-test-suite-tai
- Status: completed
- Started: 2026-11-12
- Last Updated: 2026-11-14
- Owner: agent | tai

---

## Tiến độ
Progress: 100%
Current Phase: Hoàn tất; chờ chạy notes check và mở PR

Completed:
- `conftest.py` dùng chung (SQLite trong bộ nhớ, `BrokenSession`, `add_event`).
- 6 tệp test: inference (28), service (16), earthquakes (29), statistics (6), system/prediction (33), SSE (11).
- 123 test đạt; ruff sạch trên `tests/unit`.
- Cố ý phá code để xác nhận test bắt được lỗi, rồi trả về như cũ.
In Progress:
- none
Blocked:
- none

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test (`.agents/notes/testcase/` + `test_*.py`) | DONE | `testcase/2026-11-12-offline-test-suite-tai.md` + 7 tệp trong `tests/unit/` |
| Test liên quan (`pytest`) | PASS | `uv run pytest tests/unit -q` → 123 passed |
| Lint / Build (`ruff` / `pnpm build`) | PASS | `ruff check tests/unit` + `format --check` đạt |
| Notes check (`notes_index.py --check`) | NOT_RUN | chạy khi hoàn tất bộ tài liệu |
| Tài liệu cập nhật | N/A | không đổi schema/API |

---

## Known Issues
- SQLite không chạy cú pháp PostgreSQL riêng (`func.timezone` trong statistics) — đã kiểm thủ công trên DB thật.
- `B008` ở code sản phẩm là quy tắc chung của repo; đề xuất `extend-immutable-calls`.
- `PytestDeprecationWarning` về `asyncio_default_fixture_loop_scope` — có sẵn từ trước, không ảnh hưởng.

---

## Deviations From Plan
- none (đã làm đúng phạm vi).

---

## Decisions Made During Implementation
1. Dùng SQLite trong bộ nhớ + model ORM thật thay vì `MagicMock` toàn bộ → kiểm được truy vấn lọc/đếm thật.
2. Fixture tự huấn luyện ARIMA nhỏ → test không phụ thuộc `.joblib`.
3. `BrokenSession.__getattr__` ném `OperationalError` → mọi route chạm DB đều rơi vào nhánh `DATABASE_ERROR`.
4. SSE test dùng `FakeRequest` + `monkeypatch get_latest_state` + `POLL_INTERVAL_SECONDS = 0`.
5. Cố ý phá code để xác nhận test bắt được lỗi, rồi trả về như cũ.

---

## Next Actions
- Chạy `python3 scripts/notes_index.py --check` khi đủ bộ tài liệu.
- Cân nhắc thêm `[tool.ruff.lint.flake8-bugbear] extend-immutable-calls` cho `Depends`/`Query` (cần hỏi nhóm trưởng vì là cấu hình chung).
- Commit/push nhánh `test/offline-suite`, mở PR vào `develop`.

---

## Last Update
2026-11-14 — Hoàn tất Task 4, 123 test đạt, ruff sạch trên `tests/unit`.