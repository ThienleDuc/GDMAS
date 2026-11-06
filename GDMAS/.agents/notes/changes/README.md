# Thư Mục Nhật Ký Thay Đổi Mã Nguồn (Changes & Commit Notes)

Thư mục này được sử dụng để **ghi nhận chi tiết các thay đổi so với mã nguồn gốc**, phục vụ việc tự động sinh thông điệp commit (Conventional Commit message), lưu vết nội dung thay đổi trước khi push và làm tài liệu giải trình khi tạo Pull Request trong dự án **GDMAS**.

---

## 1. Cấu Trúc Thư Mục

```text
.agents/notes/changes/
├── README.md               # Tài liệu quy ước và hướng dẫn sử dụng thư mục này
├── pending-commit.md       # [Tự động cập nhật] Ghi nhận thay đổi của đợt commit kế tiếp
└── history.md              # [Tự động tích lũy] Lưu trữ lịch sử tóm tắt các lần commit trước
```

---

## 2. Quy Cách Bản Ghi Thay Đổi (Change Record Schema)

Mỗi lần chuẩn bị commit, skill `generate-commit` sẽ ghi lại một bản ghi có cấu trúc sau vào `pending-commit.md`:

```markdown
# [PENDING COMMIT RECORD]
- **Thời gian:** 2026-11-06 20:30:00 (UTC+7)
- **Nhánh hiện tại:** docs
- **Phân loại (Type):** docs
- **Phạm vi (Scope):** setup / architecture

### 1. Tóm Tắt Ý Nghĩa Thay Đổi Kỹ Thuật
- Cập nhật yêu cầu cấu hình máy cục bộ (CPU, RAM, Docker, uv, pnpm).
- Bổ sung lệnh chạy cấu hình tự động và thủ công 5 bước trong `setup.md`.
- Tạo skill `git-commit-push` và `generate-commit` trong `.agents/skills/`.

### 2. Danh Sách Tệp Tác Động
- `M  docs/setup.md`
- `M  docs/tailieukientructuAI.md`
- `M  docs/architecture/SAD.md`
- `A  .agents/skills/git-commit-push/*`
- `A  .agents/notes/changes/*`

### 3. Thông Điệp Commit Đề Xuất (Conventional Commit)
**Header:**
```
docs(setup): update local configuration requirements and automated setup guide
```

**Body:**
```
- Define minimum & recommended hardware specs (RAM, CPU, Port 5432/8000/3000)
- Add one-click PowerShell and Bash automated configuration scripts
- Provide step-by-step verification and local test suite instructions
- Add git-commit-push and generate-commit agent skills
```
```

---

## 3. Cách Sử Dụng Cùng Skill `generate-commit`

Khi bạn muốn chuẩn bị commit:
1. Chạy skill `generate-commit` (bằng cách nhắn tin trong chat hoặc chạy script `generate-commit.ps1`).
2. Skill sẽ tự động so sánh git diff, phân tích thay đổi và cập nhật vào `pending-commit.md`.
3. Bạn có thể xem lại file `pending-commit.md` để kiểm tra trước khi tiến hành commit và push.

