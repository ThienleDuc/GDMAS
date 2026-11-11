# Nguyên tắc tham chiếu từ `.claude/` sang `.agents/`

Thư mục `.claude/notes/` chỉ giữ duy nhất tệp hướng dẫn này để điều hướng Claude Code và các agent tương thích về nguồn sự thật thống nhất của dự án **GDMAS**:

1. **Bộ kỹ năng duy nhất (`.agents/skills/`):**
   - Không lưu bản sao kỹ năng trong `.claude/skills/`. Mọi thao tác đều đọc và thực thi trực tiếp **5 skill cốt lõi** tại:
     - [`.agents/skills/write-proposal/SKILL.md`](../../.agents/skills/write-proposal/SKILL.md) — Khám phá read-only, kiểm conflict, viết proposal (`_TEMPLATE.md`).
     - [`.agents/skills/build-implementation/SKILL.md`](../../.agents/skills/build-implementation/SKILL.md) — Lập **đồng thời** `implemented/<id>/{plan.md,status.md}` và gọi `write-testcase` tạo `testcase/<id>.md`, code theo RULE-03 & I1–I7.
     - [`.agents/skills/write-testcase/SKILL.md`](../../.agents/skills/write-testcase/SKILL.md) — Sinh `.agents/notes/testcase/<id>.md` (từ [`.agents/notes/testcase/_TEMPLATE.md`](../../.agents/notes/testcase/_TEMPLATE.md)) + viết unit test offline cho 2 luồng: (1) đồng thời khi proposal `Approved`, (2) kiểm thử riêng 1 file trên nhánh `test/<id>` và ghi bug vào `.agents/notes/bugs/`.
     - [`.agents/skills/project-review/SKILL.md`](../../.agents/skills/project-review/SKILL.md) — Thẩm định OCP/Churn, 7 Bất biến I1–I7, kiểm tra `testcase/<id>.md` & mã test offline, drift & scope creep.
     - [`.agents/skills/review-pr/SKILL.md`](../../.agents/skills/review-pr/SKILL.md) — Tự động hóa Git toàn phần qua [`scripts/git-ship.sh`](../../scripts/git-ship.sh) & [`.githooks/`](../../.githooks/).

2. **Bộ nhớ quyết định duy nhất (`.agents/notes/`):**
   - Chỉ duy trì 4 thư mục chuẩn: [`proposed/`](../../.agents/notes/proposed/README.md), [`implemented/`](../../.agents/notes/implemented/README.md), [`testcase/`](../../.agents/notes/testcase/README.md), [`bugs/`](../../.agents/notes/bugs/README.md) (điểm vào: [`.agents/notes/README.md`](../../.agents/notes/README.md)).
   - Kiểm tra & sinh bảng index tự động qua `python3 scripts/notes_index.py` (`--testcases`, `--bugs`, `--check`).

3. **Nguyên tắc vận hành & phân quyền cốt lõi (chi tiết tại [`AGENTS.md`](../../AGENTS.md) & [`CLAUDE.md`](../../CLAUDE.md)):**
   - **Tiêu chí proposal (§9) thả lỏng:** Bất kỳ thành viên nào trong [`.agents/team.md`](../../.agents/team.md) (`thien`, `son`, `van`, `tai`), kể cả tác giả tự duyệt, đều có thể ký `Decision: Approved` — **không cần chờ `ThienleDuc`**.
   - **Merge PR theo nguyên tắc Không Xung Đột (Conflict-Free Gate):** **Không nhất thiết phải là `ThienleDuc`** mới được phép merge PR — chỉ cần kiểm tra **không có xung đột (`0 conflicts`)** với nhánh đích qua `./scripts/git-ship.sh merge` (hoặc GitHub PR check) và `notes_index.py --check` / test đạt chuẩn là cho phép merge.
   - **Đồng thời Implement + Testcase & Kiểm thử 1 file (`test/<id>`):** Proposal được duyệt sẽ sinh song song `implemented/<id>/` và `testcase/<id>.md` + file test offline; kiểm thử 1 file cụ thể phải checkout sang nhánh mới `test/<id>` trước khi viết unit test và ghi lỗi (nếu có) vào `.agents/notes/bugs/`.
   - **Bỏ qua hỏi với sửa/thêm an toàn; gom câu hỏi nguy hiểm cuối phiên:** Tự động thêm/sửa file theo scope không ngắt quãng hỏi từng bước; mọi thao tác xóa file/folder hoặc conflict được tạm giữ và gom thành **1 danh sách câu hỏi cuối phiên**.
