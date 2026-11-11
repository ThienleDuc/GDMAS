# Tự Động Hóa Git & Quy Chuẩn Commit (`review-pr`)

Toàn bộ quy trình Git của GDMAS được hợp nhất vào kỹ năng cốt lõi **[`review-pr`](../../../.agents/skills/review-pr/SKILL.md)** cùng wrapper an toàn [`scripts/git-ship.sh`](../../../scripts/git-ship.sh) và hệ thống hook [`.githooks/`](../../../.githooks/). Tài liệu quy chuẩn đầy đủ xem tại [docs/git-workflow.md](../../git-workflow.md).

---

## 🧭 1. Hai Thời Điểm Tự Kích Hoạt Của `review-pr`

1. **Phần A (Bắt đầu task có sửa file HOẶC kiểm thử riêng 1 file `test/<id>`):**
   - Tự sinh tên nhánh `<type>/<id>` bằng **Slug Engine** (`<id>` = `yyyy-mm-dd-<slug>-<handle>` với `<handle>` từ `./scripts/git-ship.sh me`; dùng tiền tố `test/` khi chạy luồng `single-file-test`).
   - Chạy `./scripts/git-ship.sh start <type>/<id>` để rẽ nhánh từ `origin/develop` (riêng `hotfix/*` từ `main`), tự động mang theo thay đổi chưa commit nếu có.
2. **Phần B (Tự chạy ngay khi qua validation & đã tạo `testcase/<id>.md` + test):**
   - `./scripts/git-ship.sh scope <id>` (khớp `In Scope` của `plan.md`, hoặc hiển thị phạm vi nhánh `test/<id>` / Fast-Track; `SCOPE MISMATCH` → dừng cứng).
   - Secret guard: gỡ `.env`, `.agents/me`, `.claude/me`, `.artifacts/` khỏi staging.
   - Chạy [`project-review`](../../../.agents/skills/project-review/SKILL.md) (kiểm OCP/Churn & I1–I7 + bắt buộc có `.agents/notes/testcase/<id>.md` từ [`.agents/notes/testcase/_TEMPLATE.md`](../../../.agents/notes/testcase/_TEMPLATE.md), mã unit test offline & bug log trong `.agents/notes/bugs/` nếu fail).
   - Cập nhật `status.md` (`Status: validation`) / `testcase/<id>.md` và chạy `python3 scripts/notes_index.py --check`.
   - Tổng hợp **Conventional Commit tiếng Việt** theo bảng `type(scope)` trong [docs/git-workflow.md](../../git-workflow.md) và stage tường minh từng tệp.
   - Chạy `./scripts/git-ship.sh update` (**merge-forward** `origin/develop`, không rebase) → `./scripts/git-ship.sh push` tạo/in link PR → `./scripts/git-ship.sh merge --dry-run` kiểm tra 0 conflict (hoặc `./scripts/git-ship.sh merge` để merge ngay khi không xung đột).

---

## 🔒 2. Hàng Rào Bảo Vệ, Kiểm Tra Xung Đột & Gom Câu Hỏi

- **Bảo vệ raw push lên `main` và `develop`:** `.githooks/pre-commit` và `.githooks/pre-push` chặn commit/push raw trực tiếp lên hai nhánh này khi chưa qua kiểm tra conflict/PR.
- **Bảo vệ secret & định dạng commit:** `.githooks/pre-commit` quét key/token/`.env`; `.githooks/commit-msg` ép `<type>(<scope>): <mô tả tiếng Việt>`.
- **Điều kiện Merge (Conflict-Free Gate):** `./scripts/git-ship.sh merge` kiểm tra `git merge-tree --write-tree`, trạng thái PR `mergeable` và `notes_index.py --check`. **Không bắt buộc riêng `ThienleDuc`** — chỉ cần **không có xung đột (`0 conflicts`)** là bất kỳ thành viên nào đều có thể merge; còn xung đột thì chặn cứng (`BỊ CHẶN [CONFLICT]`).
- **Tự động với thêm/sửa an toàn; gom xóa/conflict cuối phiên:** Agent không hỏi xin phép cho mỗi bước thêm/sửa file hay chạy `git-ship start`; riêng nếu phát hiện **xóa file/folder** hoặc **merge conflict nguy hiểm**, bỏ qua phần nguy hiểm và gom hết thành **1 danh sách câu hỏi cuối phiên**.
- **Đồng bộ sau merge:** Chạy `./scripts/git-ship.sh sync` để quay về `develop` mới nhất và dọn nhánh local đã merge.
