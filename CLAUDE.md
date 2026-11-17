@AGENTS.md

> Bộ kỹ năng (skills) của GDMAS đặt **duy nhất tại `.agents/skills/`** (gồm **5 skill cốt lõi**: `write-proposal`, `build-implementation`, `write-testcase`, `project-review`, `review-pr`). Đọc và gọi trực tiếp từ `.agents/skills/<name>/SKILL.md`. Mọi agent (Antigravity, Claude Code, **OpenCode**, Codex, Cursor…) dùng chung nguồn này — không nhân bản skill sang thư mục riêng của tool.
> Quy tắc tương tác: tự động bỏ qua hỏi xác nhận với các thao tác thêm/sửa file an toàn; chỉ gom câu hỏi các thao tác nguy hiểm (xóa file/folder, conflict) thành 1 danh sách cuối phiên.
