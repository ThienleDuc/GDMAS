# Hướng Dẫn Quản Lý Nhánh (Git Branching Guide)

Quản lý nhánh hiệu quả là nền tảng giúp nhóm phát triển làm việc song song mà không xung đột mã nguồn. Tài liệu này cung cấp quy chuẩn đặt tên nhánh, các thao tác tạo/chuyển/xóa nhánh, cũng như kỹ thuật Merge và Rebase trong dự án GDMAS.

---

## Mục lục
1. [Quy chuẩn đặt tên nhánh (Branch Naming Conventions)](#1-quy-chuẩn-đặt-tên-nhánh-branch-naming-conventions)
2. [Các câu lệnh cơ bản về Nhánh](#2-các-câu-lệnh-cơ-bản-về-nhánh)
3. [Chiến lược Hợp nhất nhánh (Merge Strategies)](#3-chiến-lược-hợp-nhất-nhánh-merge-strategies)
4. [Tối ưu lịch sử với Git Rebase](#4-tối-ưu-lịch-sử-với-git-rebase)
5. [Giải quyết xung đột (Conflict Resolution)](#5-giải-quyết-xung-đột-conflict-resolution)
6. [Dọn dẹp các nhánh đã cũ (Pruning & Cleanup)](#6-dọn-dẹp-các-nhánh-đã-cũ-pruning--cleanup)

---

## 1. Quy chuẩn đặt tên nhánh (Branch Naming Conventions)

Tất cả các thành viên tham gia phát triển dự án GDMAS tuân thủ quy tắc tiền tố phân loại:

| Tiền tố | Mục đích sử dụng | Ví dụ |
| :--- | :--- | :--- |
| `feature/` | Phát triển tính năng mới | `feature/disaster-map-layer`, `feature/GDM-101-auth-jwt` |
| `bugfix/` | Sửa lỗi trong quá trình phát triển (trên nhánh develop/staging) | `bugfix/n8n-webhook-timeout` |
| `hotfix/` | Sửa lỗi khẩn cấp trực tiếp từ nhánh production (`main`) | `hotfix/db-connection-leak` |
| `docs/` | Bổ sung, cập nhật tài liệu dự án | `docs/docker-guide-update` |
| `refactor/`| Tái cấu trúc mã nguồn (không thay đổi logic nghiệp vụ) | `refactor/api-response-formatter` |
| `chore/` | Cập nhật cấu hình CI/CD, dependency, linter | `chore/update-uv-dependencies` |

> **Nguyên tắc:** Dùng chữ thường (lowercase), phân tách các từ bằng dấu gạch ngang (`-`), tránh đặt tên chung chung như `test`, `my-branch`.

---

## 2. Các câu lệnh cơ bản về Nhánh

> **Mẹo:** Git hiện đại khuyến khích sử dụng lệnh `git switch` (chuyên quản lý chuyển nhánh) thay vì lệnh đa năng dễ nhầm lẫn `git checkout`.

### Xem danh sách nhánh
```bash
# Xem các nhánh cục bộ (local)
git branch

# Xem cả nhánh cục bộ và nhánh từ xa (remote)
git branch -a

# Xem chi tiết nhánh: commit hash gần nhất và upstream tracking
git branch -vv
```

### Tạo và chuyển nhánh
```bash
# Tạo nhánh mới và chuyển sang nhánh đó ngay (khuyên dùng)
git switch -c feature/disaster-map

# Cú pháp truyền thống (tương đương)
git checkout -b feature/disaster-map

# Chuyển đổi giữa các nhánh đã tồn tại
git switch main
git switch feature/disaster-map

# Chuyển nhanh về nhánh làm việc trước đó
git switch -
```

### Đổi tên nhánh
```bash
# Đổi tên nhánh đang đứng hiện tại
git branch -m feature/new-branch-name

# Đổi tên một nhánh khác
git branch -m old-name new-name

# Cập nhật tên mới lên Remote (xóa nhánh cũ trên remote và push nhánh mới)
git push origin -u feature/new-branch-name
git push origin --delete old-branch-name
```

### Xóa nhánh
```bash
# Xóa an toàn nhánh cục bộ (chỉ xóa nếu nhánh đã được merge vào main/upstream)
git branch -d feature/disaster-map

# Ép xóa nhánh cục bộ (bỏ qua cảnh báo chưa merge)
git branch -D feature/disaster-map

# Xóa nhánh trên Remote (GitHub)
git push origin --delete feature/disaster-map
```

---

## 3. Chiến lược Hợp nhất nhánh (Merge Strategies)

Khi tích hợp code từ nhánh feature vào nhánh chính (`develop` hoặc `main`):

```bash
# Đứng tại nhánh đích cần nhận code
git switch main

# 1. Fast-forward Merge (mặc định nếu không có commit rẽ nhánh)
git merge feature/disaster-map

# 2. No Fast-Forward Merge (--no-ff): Luôn tạo 1 merge commit rõ ràng để lưu vết lịch sử
git merge --no-ff feature/disaster-map -m "merge: feature/disaster-map into main"

# 3. Squash Merge: Gộp toàn bộ commit của feature branch thành duy nhất 1 commit sạch
git merge --squash feature/disaster-map
git commit -m "feat(map): implement disaster interactive map layer"
```

---

## 4. Tối ưu lịch sử với Git Rebase

Rebase giúp "dời" gốc xuất phát của nhánh bạn lên đỉnh mới nhất của nhánh chính, giúp lịch sử Git luôn là một đường thẳng sạch sẽ không có các merge commit rác.

### Đồng bộ nhánh Feature với Main mới nhất:
```bash
# Bước 1: Chuyển sang nhánh feature của bạn
git switch feature/disaster-map

# Bước 2: Tải code mới nhất từ remote
git fetch origin

# Bước 3: Rebase nhánh của bạn lên đỉnh mới nhất của origin/main
git rebase origin/main
```

### Rebase tương tác để dọn dẹp Commit (Interactive Rebase)
Trước khi tạo Pull Request, hãy gộp các commit vụn vặt (như "fix typo", "wip") thành các commit có ý nghĩa:
```bash
# Mở bảng tương tác cho 4 commit gần nhất
git rebase -i HEAD~4
```

Bảng tùy chọn trong trình soạn thảo:
- `pick`: Giữ nguyên commit.
- `reword`: Giữ commit nhưng đổi nội dung message.
- `squash` (hoặc `s`): Gộp commit này vào commit ngay phía trước nó.
- `fixup` (hoặc `f`): Gộp vào commit trước và BỎ QUA commit message của commit này.
- `drop` (hoặc `d`): Xóa bỏ hoàn toàn commit này.

---

## 5. Giải quyết xung đột (Conflict Resolution)

Xung đột xảy ra khi cùng một dòng code trong cùng một file bị chỉnh sửa khác nhau ở 2 nhánh.

### Các bước xử lý xung đột chuẩn:
1. Git sẽ dừng quá trình Merge/Rebase và thông báo danh sách file bị xung đột:
   ```text
   CONFLICT (content): Merge conflict in apps/api/main.py
   Automatic merge failed; fix conflicts and then commit the result.
   ```
2. Mở file xung đột, tìm đoạn code được Git đánh dấu:
   ```python
   <<<<<<< HEAD (nhánh hiện tại)
   API_VERSION = "v1.0.0"
   =======
   API_VERSION = "v1.1.0-beta"
   >>>>>>> feature/disaster-map (nhánh đang gộp vào)
   ```
3. Chỉnh sửa nội dung file, xóa các ký hiệu `<<<<<<<`, `=======`, `>>>>>>>` và chọn nội dung code chuẩn xác.
4. Đánh dấu file đã giải quyết xung đột:
   ```bash
   git add apps/api/main.py
   ```
5. Hoàn tất quá trình:
   - Nếu đang trong quá trình **Rebase**:
     ```bash
     git rebase --continue
     ```
   - Nếu đang trong quá trình **Merge**:
     ```bash
     git commit -m "merge: resolve conflicts between main and feature/disaster-map"
     ```

> **Cách hủy thao tác nếu bị rối:**
> - Hủy Rebase đưa mọi thứ về trạng thái ban đầu: `git rebase --abort`
> - Hủy Merge đưa mọi thứ về trạng thái ban đầu: `git merge --abort`

---

## 6. Dọn dẹp các nhánh đã cũ (Pruning & Cleanup)

Sau khi nhiều Pull Request được merge và xóa trên GitHub, danh sách remote branch trên máy bạn vẫn còn lưu tham chiếu cũ:

```bash
# Đồng bộ và xóa bỏ các tham chiếu remote-tracking branch đã bị xóa trên remote
git fetch origin --prune

# Lệnh tắt:
git remote prune origin

# Liệt kê các nhánh local đã được gộp hoàn toàn vào main (an toàn để xóa)
git branch --merged main

# Xóa nhanh các nhánh local đã merge vào main (ngoại trừ main và dev)
git branch --merged main | grep -v '^\*\|main\|master\|develop' | xargs -r git branch -d
```

