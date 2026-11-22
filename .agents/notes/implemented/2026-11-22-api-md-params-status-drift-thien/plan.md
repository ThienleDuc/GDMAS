# Implementation Plan: Đồng bộ API.md (status `running` + param `search`)

## Metadata
- ID: 2026-11-22-api-md-params-status-drift-thien
- Proposal: .agents/notes/proposed/2026-11-22-api-md-params-status-drift-thien.md
- Approved By: thien
- Approved At: 2026-11-22
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Cập nhật `docs/api/API.md` cho khớp implementation thật: §3.1 enum trạng thái service bổ sung `running`; §3.2 bảng param `/earthquakes` bổ sung `search`. Thêm test docs chặn drift.

---

## 2. Phạm vi
### In Scope
- `docs/api/API.md` — 2 đoạn (§3.1 dòng enum, §3.2 bảng param)
- `scripts/tests/test_api_docs_contracts.py` — 2 test mới đọc file docs
- `.agents/notes/testcase/2026-11-22-api-md-params-status-drift-thien.md` *(đặc tả sinh đồng thời)*
### Out of Scope
- `apps/api/**`, `apps/web/**`, `contracts/**`, migration — không đổi code/wire contract

---

## 3. Các bước
### Step 1 — Docs §3.1
Sửa câu enum thành `active`, `idle`, `error`, `unknown`, `running` (kèm ghi chú FE cũng chấp nhận alias `stopped`).
### Step 2 — Docs §3.2
Thêm dòng `| search | string | Không | - | Tìm theo place hoặc source_event_id (ilike) |` sau `max_depth`.
### Step 3 — Test docs
Bổ sung 2 assert vào `scripts/tests/test_api_docs_contracts.py`: API.md chứa token `running` trong mô tả enum và `` `search` `` trong bảng param.
### Step 4 — Validation
`python3 -m unittest scripts/tests/test_api_docs_contracts.py -v`; `notes_index --check`; hồi quy FE/BE.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có wire/DB/config change. `Architecture Impact: docs/api/API.md` — nội dung thay đổi như §1.

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] **Đã tạo đặc tả testcase** tại `.agents/notes/testcase/2026-11-22-api-md-params-status-drift-thien.md`
- [ ] **Đã chạy pass test docs offline** `scripts/tests/test_api_docs_contracts.py`
- [ ] Docs: API.md §3.1/§3.2 phản ánh đúng BE/FE
- [ ] Notes: `python3 scripts/notes_index.py --check`
- [ ] Hồi quy: `cd apps/web && pnpm test && pnpm build`; `cd apps/api && uv run pytest -q`

---

## 6. Rủi ro khi làm
Enum cũ xuất hiện ở chỗ khác trong API.md → grep trước khi sửa; test docs quá cứng → assert theo token.

---

## 7. Rollback
Revert 2 đoạn trong API.md và 2 assert trong test docs.

---

## 8. Ghi chú
Proposal docs-only nhưng vẫn sinh testcase + test tự động theo I7 để chặn drift tái diễn.
