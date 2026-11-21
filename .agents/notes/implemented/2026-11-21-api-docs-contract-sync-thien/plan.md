# Implementation Plan: Đồng bộ `docs/api/API.md` với hợp đồng và implementation BE/FE

## Metadata
- ID: 2026-11-21-api-docs-contract-sync-thien
- Proposal: .agents/notes/proposed/2026-11-21-api-docs-contract-sync-thien.md
- Approved By: thien
- Approved At: 2026-11-21
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Sửa 10 điểm drift đã đối chiếu trong proposal §2 để `docs/api/API.md` mô tả đúng payload/param/event BE đang trả, và thêm test stdlib chặn drift tái diễn.

---

## 2. Phạm vi
### In Scope
- `docs/api/API.md` — §2 envelope rỗng, §3.1 system status, §3.2 statistics, §3.3 analysis/predictions/classifications/patterns, §3.5 SSE.
- `scripts/tests/test_api_docs_contracts.py` — test doc-contract offline (stdlib `unittest`).
- `.agents/notes/testcase/2026-11-21-api-docs-contract-sync-thien.md` — đặc tả sinh đồng thời.

### Out of Scope
- `apps/api/**`, `apps/web/**`, `contracts/schemas/**`, `contracts/examples/**`, migration Alembic.
- `AGENTS.md`, `docs/quyuocchung.md`, `CLAUDE.md`.
- Bổ sung field BE chưa trả (`r_squared`, `note`, `status`) — ghi chú optional/chờ BE proposal riêng.
- Commit/push/merge (dừng CHECKPOINT 1).

---

## 3. Các bước
### Step 1 — Sửa §2/§3.1/§3.2
Thêm mục "Phản hồi rỗng hợp lệ"; đổi key/status system; thay ví dụ statistics theo payload BE.

### Step 2 — Sửa §3.3
Bổ sung `/api/v1/patterns`; chỉnh histogram/trend/seasonality/correlation; đổi nhãn classification sang 4 nhãn; ghi rõ 2 shape payload Pattern 5/6.

### Step 3 — Sửa §3.5
Thêm `/stream/earthquakes`, 6 event, packet `{event,data,timestamp}`.

### Step 4 — Test & validation
Tạo `scripts/tests/test_api_docs_contracts.py`; chạy `python3 -m unittest discover -s scripts/tests -v`, `python3 scripts/notes_index.py --check`; dừng CHECKPOINT 1.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có. Chỉ markdown + test đọc file.

---

## 5. Validation
- [x] Đã tạo testcase `.agents/notes/testcase/2026-11-21-api-docs-contract-sync-thien.md`
- [ ] Đã tạo/chạy `scripts/tests/test_api_docs_contracts.py`
- [ ] `python3 -m unittest discover -s scripts/tests -v`
- [ ] `python3 scripts/notes_index.py --check`
- [ ] OCP: 0 deletion, không đụng core protected

---

## 6. Rủi ro
- Docs là vùng chung — PR phải ghi rõ đã đối chiếu BE, chủ vùng T6 (`tai`).
- BE chưa trả một số field đã có trong schema — ghi chú optional, không khẳng định sai.

---

## 7. Rollback
Revert commit/PR; không có thay đổi runtime hay DB.

---

## 8. Ghi chú
Workspace tách riêng (`/tmp/opencode/gdmas-docs-api-sync`) để không làm dở công việc statistics trên nhánh chính.
