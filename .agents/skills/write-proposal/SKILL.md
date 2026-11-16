---
name: write-proposal
description: >-
  Pha 1+2 của agent workflow GDMAS (docs/agent-workflow.md) — khám phá read-only, kiểm tra
  xung đột quyết định cũ qua notes_index.py, chuẩn hóa ID bằng Slug Engine, viết proposal từ
  _TEMPLATE.md vào .agents/notes/proposed/, rồi DỪNG chờ thành viên xác nhận §9. Tiêu chí
  proposal thả lỏng: bất kỳ thành viên nào trong .agents/team.md (kể cả tác giả) đều duyệt
  được §9, KHÔNG cần ThienleDuc.
---

# write-proposal

Pha 1 (Discovery) + Pha 2 (Proposal). Quy trình: [docs/agent-workflow.md](../../../docs/agent-workflow.md).
Khuôn mẫu: [.agents/notes/proposed/_TEMPLATE.md](../../../.agents/notes/proposed/_TEMPLATE.md). Giữ khóa máy đọc tiếng Anh.

## Luật

- **Read-only:** Chỉ đọc / tìm kiếm. Không sửa code nguồn hay tệp cấu hình ngoài file proposal mới
  (bảng index tự sinh bằng `scripts/notes_index.py`, không sửa tay README).
- **Không nhảy thẳng vào code:** Nếu yêu cầu thật sự tầm thường (sửa ≤ 1 dòng / ≤ 1 file, không đổi logic/contract),
  hỏi rõ có đi luồng Fast-Track (chuyển thẳng sang `review-pr`) không, không tự bỏ qua im lặng.
- **Tiêu chí proposal thả lỏng (không cần `ThienleDuc` duyệt):** Bất kỳ thành viên nào trong [.agents/team.md](../../../.agents/team.md)
  (`thien`, `son`, `van`, `tai`) — kể cả **tác giả tự duyệt** — đều ký được `Decision: Approved` ở §9.

## Các bước

1. **Đọc bối cảnh (read-only):**
   - Yêu cầu người dùng nêu trong chat (hoặc issue GitHub `ThienleDuc/GDMAS`).
   - [AGENTS.md](../../../AGENTS.md) và [.agents/team.md](../../../.agents/team.md).
   - Tài liệu kiến trúc & bất biến: [docs/coding-rules.md](../../../docs/coding-rules.md),
     [docs/quyuocchung.md](../../../docs/quyuocchung.md), [docs/architecture/SAD.md](../../../docs/architecture/SAD.md),
     [docs/api/API.md](../../../docs/api/API.md), [contracts/README.md](../../../contracts/README.md).
   - **Quyết định cũ & Kiểm conflict** (theo [.agents/notes/README.md](../../../.agents/notes/README.md)):
     - Chạy `python3 scripts/notes_index.py` và `grep -ril "<từ khóa>" .agents/notes/proposed/ .agents/notes/implemented/`.
     - Đọc cả các proposal `Decision: Rejected` (`Scope of Rejection:`) và mục 5 của proposal khác.
     - Mâu thuẫn quyết định đã chốt hoặc nằm trong `Scope of Rejection` → **DỪNG** và báo:
       ```text
       CONFLICT DETECTED
       Existing decision: .agents/notes/proposed/<file>.md — "<tóm tắt>" (Decision: <…>)
       Current task: <việc đang được yêu cầu>
       Action required: Cần proposal mới ghi "Overrides: <id>" và lý do. File cũ không bị sửa.
       ```
   - Chạy `python3 scripts/notes_index.py --bugs` và đọc [.agents/notes/bugs/INDEX.md](../../../.agents/notes/bugs/INDEX.md).

2. **Cấp ID `yyyy-mm-dd-<slug>-<handle>` bằng Slug Engine:**
   - `<handle>`: lấy từ `./scripts/git-ship.sh me` (chưa có thì hỏi 1 lần theo `.agents/team.md` rồi chạy `./scripts/git-ship.sh me <handle>`).
   - `<slug>`: chuyển mô tả công việc sang tiếng Anh không dấu chữ thường (`áàảãạâ...đ` → `a...d`), bỏ ký tự đặc biệt, loại stop-words (`la, va, cho, cua, tai, trong, tu, cac, nhung, mot, de, voi, the, a, an, for, to, in, on, of, and, khi, do`), giữ 2–4 từ khóa kỹ thuật nối bằng `-` (vd. `trend-resample-api`).

3. **Viết proposal `.agents/notes/proposed/<id>.md`:**
   - Copy cấu trúc từ [.agents/notes/proposed/_TEMPLATE.md](../../../.agents/notes/proposed/_TEMPLATE.md).
   - Metadata `Status: proposed`, §9 `Decision: Pending`.
   - Điền **`Architecture Impact`** trung thực để `project-review` kiểm drift.
   - Điền **§8. Cách kiểm chứng & Tệp test dự kiến**: khai báo rõ đặc tả testcase `.agents/notes/testcase/<id>.md` (copy từ `.agents/notes/testcase/_TEMPLATE.md`) và tệp test tự động offline (`apps/api/tests/.../test_*.py`, `scripts/tests/test_*.py` hoặc FE test) sẽ được sinh đồng thời khi proposal được duyệt.
   - Thay quyết định cũ → `- Overrides: <id>`. Sửa bug → `Related Bugs: BUG-<handle>-NNN`.

4. **Kiểm tra nhất quán:** `python3 scripts/notes_index.py --check`.

5. **Trình bày proposal và DỪNG chờ xác nhận §9:**
   - Tóm tắt: Mục tiêu, Phạm vi tệp (gồm cả tệp test dự kiến), Đánh đổi, 7 Terminals & Invariants I1–I7.
   - Mời người dùng xác nhận §9 (tự sửa file hoặc xác nhận rõ trong chat để agent ghi thay với `Reviewer: <handle>` — **không cần chờ `ThienleDuc`**). Im lặng không phải duyệt.

## Sửa sau "Changes Requested"

Đọc `Comments:`, sửa trực tiếp trên chính file proposal đó, đặt `Status: changes_requested`, thêm `### Revision yyyy-mm-dd` dưới §10, rồi dừng chờ xác nhận lại.

## Skill này không làm

Không viết code, không tạo `implemented/<id>/`, không tự ý điền §9 khi chưa có xác nhận, không di chuyển/xóa note, không commit/push.
