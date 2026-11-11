<!-- Template cho .agents/notes/implemented/yyyy-mm-dd-<slug>-<handle>/plan.md — chỉ tạo sau khi proposal có Decision: Approved ở §9.
     Tầng thực thi, không chép lại lý lẽ của proposal. Luật: docs/agent-workflow.md. -->

# Implementation Plan: <Tên>

## Metadata
- ID: yyyy-mm-dd-<slug>-<handle>
- Proposal: .agents/notes/proposed/yyyy-mm-dd-<slug>-<handle>.md
- Approved By: <handle từ §9>
- Approved At: yyyy-mm-dd
- Implementer: agent | <handle>
- Status: planned

---

## 1. Mục tiêu
Chính xác là làm gì.

---

## 2. Phạm vi
### In Scope
- `<tệp code nguồn được phép tạo/sửa>`
- `.agents/notes/testcase/yyyy-mm-dd-<slug>-<handle>.md` *(đặc tả testcase sinh đồng thời từ `_TEMPLATE.md`)*
- `apps/api/tests/<unit|integration>/test_<module>.py` *(hoặc `scripts/tests/` / FE test)*
### Out of Scope
- `<tệp lõi hoặc phân hệ liền kề cố ý không đụng — tuân thủ RULE-03 & I1–I7>`

---

## 3. Các bước
### Step 1 — <tên>
Mô tả / tệp / thay đổi mong đợi.
### Step 2 — <tên>
...

---

## 4. Thay đổi dữ liệu / API / cấu hình
Alembic migration mới, endpoint, schema trong `contracts/`, biến môi trường (`.env.example`). Ghi "Không có" nếu không có.

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
Chỉ kiểm tra phần diff đụng tới:
- [ ] **Đã tạo đặc tả testcase** tại `.agents/notes/testcase/<id>.md` (từ `.agents/notes/testcase/_TEMPLATE.md`)
- [ ] **Đã tạo và chạy pass file unit/integration test offline** (`apps/api/tests/.../test_*.py`, `scripts/tests/...` hoặc FE test)
- [ ] Backend test liên quan (nếu đụng `apps/api`): `cd apps/api && uv run pytest <test_file>`
- [ ] Backend lint/format (nếu đụng `apps/api`): `cd apps/api && uv run ruff check . && uv run ruff format --check .`
- [ ] Frontend typecheck & build (nếu đụng `apps/web`): `cd apps/web && pnpm build`
- [ ] Kiểm tra nhất quán notes: `python3 scripts/notes_index.py --check`
- [ ] Tài liệu bị ảnh hưởng (`Architecture Impact`) đã cập nhật
- [ ] `<1–3 kiểm tra chức năng riêng của việc này>`

Chạy cả bộ test (`cd apps/api && uv run pytest`) khi diff rộng (đụng `contracts/**`, `apps/api/alembic/**`,
`apps/api/src/gdmas/core/**`, `apps/api/src/gdmas/db/**`, `apps/api/src/gdmas/main.py`, `docker-compose.yml`, `.env.example`).

---

## 6. Rủi ro khi làm
Rủi ro kỹ thuật lúc build + cách giảm.

---

## 7. Rollback
Làm gì nếu thất bại (revert PR / commit, `alembic downgrade -1`…).

---

## 8. Ghi chú
Ràng buộc khác, nếu có.

