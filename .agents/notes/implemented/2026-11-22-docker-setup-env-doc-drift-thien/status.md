# Implementation Status: Sửa docs/setup.md theo cấu hình Docker thật

## Metadata
- ID: 2026-11-22-docker-setup-env-doc-drift-thien
- Status: completed
- Started: 2026-11-22
- Last Updated: 2026-11-22
- Owner: agent | thien

---

## Tiến độ
Progress: 100%
Current Phase: validation — chờ workflow tiếp tục

Completed:
- §9 Approved (ủy quyền auto-workflow của người dùng)
- Sinh đồng thời plan/status + testcase
- Sửa 6 điểm drift trong docs/setup.md + mặc định `VITE_API_MOCKING=disabled` trong `.env.example`
- `scripts/tests/test_setup_docs.py` 8/8 pass
- Smoke Docker thật: Postgres healthy, Alembic OK, Ingestion nạp 8 sự kiện USGS, API/SSE trả dữ liệu thật, FE phục vụ module với mock=disabled

In Progress:
- none

Blocked:
- none

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test | DONE | `testcase/<id>.md` (passed) + `scripts/tests/test_setup_docs.py` (8/8) |
| Test liên quan | PASS | `unittest discover` 43/43; BE 322; FE 228 |
| Build / Lint | PASS | `pnpm build` OK; `ruff check/format` OK |
| Notes check | PASS | `notes_index.py --check`: OK |
| Tài liệu | DONE | docs/setup.md + apps/web/.env.example |

---

## Known Issues
- none

---

## Deviations From Plan
- `apps/web/.env.example` bổ sung vào In Scope (đã cập nhật plan.md) để mặc định tắt mock — cần thiết cho mục tiêu "không dùng dữ liệu mock".
- Không chạy `git-ship.sh start` riêng: gom trên nhánh `chore/docker-fe-be-connection-thien` theo yêu cầu người dùng.

---

## Decisions Made During Implementation
- Sửa docs theo code thật thay vì đổi code để khớp docs sai.
- Docker image `api`/`web` build bị kẹt ở apt download → theo đúng docs/setup.md §4 dùng tiến trình local (uvicorn/pnpm) với Postgres Docker; kết quả vẫn chứng minh BE→FE thật.

---

## Next Actions
- Tiếp tục workflow tự động: scope, project-review, commit, push, PR, merge, sync, `completed`.

---

## Last Update
2026-11-22 — Validation xanh; PR #85 merge vào develop tại `c9ed6dc` → `completed`.
