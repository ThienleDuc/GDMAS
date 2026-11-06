# Quy Trình Tạo & Đánh Giá Pull Request (Pull Request & GitHub Workflow)

Tài liệu này hướng dẫn quy trình tiêu chuẩn khi làm việc với Pull Request (PR) trên GitHub trong dự án GDMAS, từ bước chuẩn bị code, tạo PR bằng giao diện web hoặc GitHub CLI (`gh`), đến review và merge code an toàn.

---

## Mục lục
1. [Quy trình tổng quan (Workflow Overview)](#1-quy-trình-tổng-quan-workflow-overview)
2. [Các bước chuẩn bị trước khi mở PR (Pre-PR Checklist)](#2-các-bước-chuẩn-bị-trước-khi-mở-pr-pre-pr-checklist)
3. [Tạo Pull Request với GitHub CLI (`gh`)](#3-tạo-pull-request-với-github-cli-gh)
4. [Mẫu mô tả PR chuẩn (PR Description Template)](#4-mẫu-mô-tả-pr-chuẩn-pr-description-template)
5. [Quy trình Đánh giá & Cập nhật PR (Code Review)](#5-quy-trình-đánh-giá--cập-nhật-pr-code-review)
6. [Hợp nhất PR (Merge) & Dọn dẹp sau Merge](#6-hợp-nhất-pr-merge--dọn-dẹp-sau-merge)

---

## 1. Quy trình tổng quan (Workflow Overview)

```text
[Nhánh main mới nhất] 
       │
       └──> [Tạo nhánh: feature/xyz] ──> [Viết code & Commit]
                                                  │
                                                  ▼
                                      [Kiểm thử & Rebase main]
                                                  │
                                                  ▼
                                      [Push & Mở Pull Request]
                                                  │
                                                  ▼
                                      [CI Pass + Code Review]
                                                  │
                                                  ▼
                                      [Squash & Merge vào main]
```

---

## 2. Các bước chuẩn bị trước khi mở PR (Pre-PR Checklist)

Trước khi gửi PR cho đồng đội review, hãy đảm bảo các yêu cầu sau trên máy của bạn:

### 1. Đồng bộ với nhánh chính mới nhất
```bash
# Đang đứng tại nhánh làm việc
git switch feature/disaster-map

# Kéo cập nhật mới nhất từ origin/main và rebase nhánh của bạn
git fetch origin
git rebase origin/main
```

### 2. Chạy test suite và linter cục bộ
- **Backend (API):**
  ```bash
  # Chạy test suite
  pytest
  # Kiểm tra format code (nếu có linter như ruff/flake8)
  ruff check .
  ```
- **Frontend (Web):**
  ```bash
  # Kiểm tra TypeScript typecheck và build production
  npm run build
  ```

### 3. Đẩy nhánh lên Remote
```bash
# Push lần đầu kèm tracking upstream
git push -u origin feature/disaster-map

# Nếu đã từng rebase, sử dụng cờ an toàn --force-with-lease
git push --force-with-lease
```

---

## 3. Tạo Pull Request với GitHub CLI (`gh`)

Sử dụng công cụ chính thức [GitHub CLI (`gh`)](https://cli.github.com/) giúp tăng tốc độ thao tác trực tiếp từ terminal.

### Đăng nhập GitHub CLI (làm một lần đầu)
```bash
gh auth login
```

### Tạo Pull Request
```bash
# Mở form tương tác tạo PR (nhập tiêu đề, mô tả, reviewer, label)
gh pr create

# Tạo nhanh PR với tiêu đề và nội dung ngắn gọn
gh pr create \
  --title "feat(api): add disaster realtime alert endpoint" \
  --body "Triển khai endpoint lấy thông tin cảnh báo thiên tai theo thời gian thực. Closes #42." \
  --base main \
  --assignee "@me"

# Tạo PR ở chế độ Nháp (Draft PR - khi code chưa xong cần xin ý kiến sớm)
gh pr create --draft --title "wip: explore websocket integration"
```

### Quản lý & Tương tác với PR qua CLI
```bash
# Xem danh sách các PR đang mở của dự án
gh pr list

# Xem trạng thái PR của nhánh hiện tại (CI checks, review status)
gh pr status

# Tải và chuyển sang nhánh PR của đồng đội để test trên máy mình
gh pr checkout 123

# Xem chi tiết nội dung code thay đổi của PR số 123
gh pr diff 123

# Mở PR hiện tại trên trình duyệt web mặc định
gh pr view --web
```

---

## 4. Mẫu mô tả PR chuẩn (PR Description Template)

Khi mở PR trên Web hoặc CLI, hãy trình bày rõ ràng theo mẫu sau:

```markdown
## 📌 Tóm tắt thay đổi
- Bổ sung router `/api/v1/alerts` hỗ trợ truy vấn danh sách thiên tai.
- Tích hợp schema Pydantic validation cho request payload.
- Thêm unit test kiểm tra trường hợp dữ liệu toạ độ không hợp lệ.

## 🔗 Liên kết Issue liên quan
Closes #42

## 🧪 Hướng dẫn kiểm thử
1. Khởi động môi trường: `docker compose up -d`
2. Gửi request:
   ```bash
   curl -X GET http://localhost:8000/api/v1/alerts?severity=high
   ```
3. Kết quả mong đợi: Trả về HTTP 200 kèm danh sách cảnh báo.

## 📋 Checklist tự kiểm tra
- [ ] Code tuân thủ coding conventions của dự án.
- [ ] Đã bổ sung unit tests và toàn bộ test đều PASS.
- [ ] Không có file thừa hoặc file nhạy cảm (`.env`, log, cache).
- [ ] CI pipeline hoàn thành thành công (màu xanh).
```

---

## 5. Quy trình Đánh giá & Cập nhật PR (Code Review)

### Góp ý và thảo luận
- Reviewer đọc code, kiểm tra logic, độ bảo mật và tính mở rộng.
- Nếu cần sửa đổi, reviewer để lại nhận xét (comment) hoặc dùng tính năng **Suggest Change** của GitHub.

### Cập nhật mã nguồn theo góp ý của Reviewer
Khi cần sửa theo góp ý, bạn chỉ cần sửa code ở nhánh local hiện tại và push lên:

```bash
# 1. Chỉnh sửa mã nguồn theo feedback
# 2. Tạo commit mới hoặc amend
git add .
git commit -m "fix(api): handle null coordinates edge case"

# 3. Đẩy lên nhánh đang mở PR
git push origin feature/disaster-map
```
> Giao diện GitHub PR sẽ tự động cập nhật commit mới nhất vào PR mà không cần tạo PR mới.

---

## 6. Hợp nhất PR (Merge) & Dọn dẹp sau Merge

### Lựa chọn chiến lược Merge trên GitHub:
- **Squash and merge (Khuyên dùng cho Feature PR):** Gộp toàn bộ commit của PR thành 1 commit duy nhất vào nhánh `main`. Giúp lịch sử nhánh `main` luôn cô đọng và dễ theo dõi.
- **Rebase and merge:** Chuyển toàn bộ commit của PR nối tiếp vào `main`.
- **Create a merge commit:** Dùng khi muốn giữ nguyên toàn bộ lịch sử phân nhánh phức tạp.

### Đồng bộ và dọn dẹp máy cục bộ sau khi PR đã Merge:
Sau khi PR được merge thành công trên GitHub và nhánh remote đã bị xóa:

```bash
# 1. Chuyển về nhánh main
git switch main

# 2. Cập nhật code mới nhất vừa được merge về máy
git pull origin main

# 3. Xóa nhánh feature cũ trên máy cục bộ
git branch -d feature/disaster-map

# 4. Dọn dẹp các tracking branch đã bị xóa trên remote
git fetch --prune
```

