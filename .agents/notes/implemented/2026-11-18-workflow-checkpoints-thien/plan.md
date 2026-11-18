# Implementation Plan: Thêm 2 checkpoint quyết định vào workflow

## Metadata
- ID: 2026-11-18-workflow-checkpoints-thien
- Proposal: .agents/notes/proposed/2026-11-18-workflow-checkpoints-thien.md
- Approved By: thien
- Approved At: 2026-11-18
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Thêm CHECKPOINT 1 (sau validation, trước commit/push) và CHECKPOINT 2 (sau push/PR + dry-run, trước merge) vào luồng Spec-Driven/Fast-Track/test/<id>, kèm cụm khởi động `tiếp tục workflow` để người dùng tiếp tục đúng chỗ đang dừng. Chỉ sửa tài liệu định nghĩa quy trình + 1 test offline chống drift; không đổi code runtime.

---

## 2. Phạm vi
### In Scope
- `.agents/skills/build-implementation/SKILL.md` — bước 7: thay auto transfer bằng CHECKPOINT 1 + 3 lựa chọn + cụm khởi động.
- `.agents/skills/review-pr/SKILL.md` — Phần B tách B1 (đến push+PR+dry-run) → CHECKPOINT 2 → B2 (merge+sync+completed); cập nhật mục "Khi nào chạy".
- `.agents/skills/write-testcase/SKILL.md` — luồng 2 bước 5 thêm dừng CHECKPOINT 1.
- `AGENTS.md` — bảng quyền hạn, mục Git & PR, mô tả 2 skill (build-implementation, review-pr).
- `CLAUDE.md` — quy tắc tương tác thêm 2 checkpoint + cụm khởi động.
- `.claude/notes/README.md` — nguyên tắc vận hành thêm 2 checkpoint.
- `docs/agent-workflow.md` — Pha 4/5, Mermaid, §5 dừng cứng, §6 Output Contract, §8 bảng skill.
- `docs/git-workflow.md` — sơ đồ luồng tự động hóa thêm 2 nhánh checkpoint.
- `scripts/tests/test_workflow_checkpoints.py` — unit test offline kiểm chống drift.
- `.agents/notes/testcase/2026-11-18-workflow-checkpoints-thien.md` *(đặc tả testcase sinh đồng thời từ `_TEMPLATE.md`)*
- `.agents/notes/proposed/2026-11-18-workflow-checkpoints-thien.md`
- `.agents/notes/implemented/2026-11-18-workflow-checkpoints-thien/{plan,status}.md`

### Out of Scope
- `apps/api/**`, `apps/web/src/**`, `contracts/**`, Alembic migration, route API (I1–I4).
- Cú pháp lệnh `scripts/git-ship.sh`, hook `.githooks/`, điều kiện Conflict-Free Gate (giữ nguyên).
- §9 Proposal Review, Anti-Interrupt, quy tắc gom câu hỏi cuối phiên (giữ nguyên, chỉ bổ sung checkpoint).
- Không xóa/sửa skill cũ đang dùng theo nghĩa làm mất nội dung — chỉ mở rộng bằng checkpoint (RULE-03).

---

## 3. Các bước
### Step 1 — Sửa 3 file SKILL.md
`build-implementation`: bước 7 đổi "TỰ ĐỘNG" → dừng CHECKPOINT 1, ghi rõ 3 lựa chọn + cụm `tiếp tục workflow`. `review-pr`: tách Phần B thành B1/B2 với CHECKPOINT 2 giữa, cập nhật mục "Khi nào chạy" và bước 10–11. `write-testcase`: luồng 2 bước 5 chèn dừng CHECKPOINT 1.

### Step 2 — Sửa luật/docs trung tâm
`AGENTS.md` (bảng quyền hạn dòng 90, Git & PR `:96–99`, bảng skill `:107,110`); `CLAUDE.md`; `.claude/notes/README.md`; `docs/agent-workflow.md` (Pha 4/5, Mermaid, §5, §6, §8); `docs/git-workflow.md` (sơ đồ `:16–39`). Giữ nguyên cụm Conflict-Free Gate và "không bắt buộc ThienleDuc".

### Step 3 — Test offline chống drift
Tạo `scripts/tests/test_workflow_checkpoints.py` (unittest): khẳng định `CHECKPOINT 1`, `CHECKPOINT 2`, `tiếp tục workflow` xuất hiện trong đủ 8 tệp định nghĩa workflow; `build-implementation` không còn cục bộ "TỰ ĐỘNG chuyển giao"; `review-pr` có nhánh B1/B2; Mermaid/git-workflow có nút dừng.

### Step 4 — Validation & dừng CHECKPOINT 1
Chạy `python3 -m unittest scripts/tests/test_workflow_checkpoints.py -v`, `python3 scripts/notes_index.py --check`, `git diff --check`. Cập nhật testcase/status → `Status: validation`. **DỪNG** ở CHECKPOINT 1: xuất Implementation Report + 3 lựa chọn + cụm `tiếp tục workflow`. Không commit/push theo checkpoint mới.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có. Chỉ tài liệu quy trình + file test offline; không biến môi trường, không schema, không migration.

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] Đã tạo đặc tả testcase tại `.agents/notes/testcase/2026-11-18-workflow-checkpoints-thien.md` (từ `_TEMPLATE.md`)
- [x] Đã tạo file test offline `scripts/tests/test_workflow_checkpoints.py`
- [x] Chạy `python3 -m unittest scripts/tests/test_workflow_checkpoints.py -v` — 7/7 pass (18/18 scripts tests)
- [x] Notes: `python3 scripts/notes_index.py --check`
- [x] `git diff --check`
- [x] 8 tệp định nghĩa workflow chứa đủ 2 checkpoint + cụm khởi động; Conflict-Free Gate & §9 còn nguyên

---

## 6. Rủi ro khi làm
- Agent quên dừng ở checkpoint (vẫn auto push/merge) → sửa rõ bước 7 + bước 10–11, Output Contract bắt buộc in checkpoint, test soi cụm từ.
- Drift giữa 8 tệp → test offline kiểm tra toàn bộ.
- Sửa `AGENTS.md` ngoài scope đã duyệt → chỉ đổi đúng dòng mô tả luồng đã ghi trong proposal §4.3.

---

## 7. Rollback
Revert riêng 9 tệp (chủ yếu markdown) bằng PR/commit mới; không có DB/API runtime cần migration.

---

## 8. Ghi chú
Proposal §9 đã `Approved` (Reviewer: thien, 2026-11-18). Theo checkpoint mới đang được cài đặt, sau validation agent **dừng ở CHECKPOINT 1** chờ người dùng quyết định commit/push — không tự động gọi `review-pr` Phần B.
