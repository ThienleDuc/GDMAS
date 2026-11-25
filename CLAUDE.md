@AGENTS.md

> Bộ kỹ năng (skills) của GDMAS đặt **duy nhất tại `.agents/skills/`** (gồm **5 skill cốt lõi**: `write-proposal`, `build-implementation`, `write-testcase`, `project-review`, `review-pr`). Đọc và gọi trực tiếp từ `.agents/skills/<name>/SKILL.md`. Mọi agent (Antigravity, Claude Code, **OpenCode**, Codex, Cursor…) dùng chung nguồn này — không nhân bản skill sang thư mục riêng của tool.
> Quy tắc tương tác: tự động bỏ qua hỏi xác nhận với các thao tác thêm/sửa file an toàn; chỉ gom câu hỏi các thao tác nguy hiểm (xóa file/folder, conflict) thành 1 danh sách cuối phiên.
> 2 checkpoint bắt buộc: sau validation (CHECKPOINT 1 — commit/push hay dừng?) và sau push/PR + 0 conflict (CHECKPOINT 2 — merge hay giữ PR?). Chưa xác nhận thì không commit/push/merge. Để tiếp tục, gõ `tiếp tục workflow` (chấp nhận `continue workflow`) — agent resume đúng checkpoint đang dừng, in rõ tên checkpoint + cụm này mỗi lần dừng.
