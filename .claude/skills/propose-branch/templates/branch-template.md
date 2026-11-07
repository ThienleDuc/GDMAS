# [BẢN ĐỀ XUẤT PHÂN NHÁNH GIT - BRANCH PROPOSAL]

- **Thời gian lập:** {{TIMESTAMP}}
- **Mô tả công việc (Task Description):** {{TASK_DESCRIPTION}}
- **Phân loại tác vụ (Type):** `{{TYPE}}`
- **Phạm vi tác động (Scope):** `{{SCOPE}}`
- **Nhánh cơ sở (Base Branch):** `{{BASE_BRANCH}}`

---

## 1. Tên Nhánh Đề Xuất (GDMAS Standard)

### 🌟 Nhánh Đề Xuất Chính Thức (Khuyến nghị):
```text
{{BRANCH_NAME}}
```

### 🔀 Các Tùy Chọn Đặt Tên Khác:
- **Dạng ngắn gọn:** `{{BRANCH_NAME_SHORT}}`
- **Dạng theo ticket/task:** `{{BRANCH_NAME_TICKET}}`

---

## 2. Kế Hoạch Triển Khai Công Việc (Task Checklist)
{{CHECKLIST}}

---

## 3. Lệnh Git Khởi Tạo & Thao Tác

```bash
# 1. Chuyển về nhánh cơ sở và cập nhật mới nhất
git switch {{BASE_BRANCH}}
git pull origin {{BASE_BRANCH}}

# 2. Tạo và chuyển sang nhánh làm việc mới
git switch -c {{BRANCH_NAME}}

# 3. Sau khi hoàn thành công việc, stage và commit bằng tiếng Việt
git add <cac-tep-thay-doi>
.\.agents\skills\generate-commit\scripts\generate-commit.ps1 -Commit

# 4. Đẩy nhánh lên Remote và mở Pull Request vào {{BASE_BRANCH}}
git push -u origin {{BRANCH_NAME}}
```

---
*Bản đề xuất này được sinh tự động bởi kỹ năng propose-branch và chỉ lưu trữ cục bộ tại .agents/notes/branches/.*

