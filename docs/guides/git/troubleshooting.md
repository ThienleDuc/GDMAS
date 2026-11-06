# Hướng Dẫn Cứu Nguy & Xử Lý Sự Cố Git (Git Troubleshooting & Recovery)

Trong quá trình làm việc với Git, hầu như ai cũng từng gặp sự cố như commit nhầm, lỡ tay xóa nhánh, xung đột file, hoặc commit nhầm file nhạy cảm. Tài liệu này cung cấp các giải pháp cứu hộ chi tiết và an toàn nhất.

---

## Mục lục
1. [Sửa chữa Commit vừa tạo (Commit Mistakes)](#1-sửa-chữa-commit-vừa-tạo-commit-mistakes)
2. [Cứu hộ dữ liệu bị mất bằng Git Reflog (Chiêu cứu hộ tối thượng)](#2-cứu-hộ-dữ-liệu-bị-mất-bằng-git-reflog-chiêu-cứu-hộ-tối-thượng)
3. [Thoát khỏi trạng thái "Detached HEAD"](#3-thoát-khỏi-trạng-thái-detached-head)
4. [Xóa file nhạy cảm / file rác đã trót commit](#4-xóa-file-nhạy-cảm--file-rác-đã-trót-commit)
5. [Khắc phục lỗi ngắt dòng CRLF và LF trên Windows](#5-khắc-phục-lỗi-ngắt-dòng-crlf-và-lf-trên-windows)
6. [Lỗi xác thực GitHub (Authentication Failed / SSH)](#6-lỗi-xác-thực-github-authentication-failed--ssh)
7. [Bảng tra cứu nhanh "Lỡ tay thì cứu thế nào?"](#7-bảng-tra-cứu-nhanh-lỡ-tay-thì-cứu-thế-nào)

---

## 1. Sửa chữa Commit vừa tạo (Commit Mistakes)

### Tình huống 1: Quên file hoặc viết sai nội dung commit vừa xong (Chưa push)
```bash
# 1. Thêm file bị quên vào Staging Area
git add path/to/forgotten-file.py

# 2. Gộp vào commit gần nhất và sửa lại thông điệp (hoặc giữ nguyên)
git commit --amend -m "feat(api): add complete validation logic"

# Hoặc giữ nguyên commit message cũ
git commit --amend --no-edit
```

### Tình huống 2: Hủy commit vừa tạo nhưng vẫn GIỮ NGUYÊN code đã viết
```bash
# Đưa HEAD lùi lại 1 commit, code vẫn còn nguyên vẹn trong Working Directory (Staged)
git reset --soft HEAD~1

# Hoặc unstage toàn bộ code về trạng thái chưa git add
git reset HEAD~1
```

### Tình huống 3: Commit sai đã lỡ Push lên Remote nhánh chung (`main`, `develop`)
> **NGUYÊN TẮC VÀNG:** Tuyệt đối không dùng `git reset --hard` rồi ép push (`--force`) lên nhánh chung vì sẽ làm hỏng lịch sử Git của các thành viên khác!
```bash
# Tạo một commit mới có nội dung ĐẢO NGƯỢC lại hoàn toàn commit lỗi
git revert <commit_hash_loi>

# Sau đó push commit revert này lên
git push origin main
```

---

## 2. Cứu hộ dữ liệu bị mất bằng Git Reflog (Chiêu cứu hộ tối thượng)

`git reflog` là "hộp đen" ghi lại mọi hành động di chuyển con trỏ `HEAD` trên máy cục bộ của bạn (kể cả khi bạn chạy `git reset --hard` hay xóa nhầm branch).

### Kịch bản: Lỡ tay chạy `git reset --hard` làm mất toàn bộ commit vừa làm
```bash
# Bước 1: Mở nhật ký reflog
git reflog
```
Màn hình sẽ hiển thị lịch sử dạng:
```text
4f2e1a3 HEAD@{0}: reset: moving to HEAD~1
a8c9012 HEAD@{1}: commit: feat(api): vital feature code (ĐÂY LÀ COMMIT BỊ MẤT)
b7d8123 HEAD@{2}: checkout: moving from main to feature/disaster-map
```

```bash
# Bước 2: Khôi phục lại trạng thái tại commit a8c9012
# Cách A: Đưa HEAD trở lại commit đó
git reset --hard HEAD@{1}

# Cách B (An toàn hơn): Tạo một nhánh mới từ commit bị mất đó
git switch -c recovered-feature a8c9012
```

---

## 3. Thoát khỏi trạng thái "Detached HEAD"

### Triệu chứng:
Terminal hiển thị thông báo: `You are in 'detached HEAD' state.`

### Nguyên nhân:
Bạn đã `checkout` trực tiếp vào một Commit Hash hoặc Tag thay vì tên một Nhánh. Mọi commit tạo ra lúc này sẽ không thuộc về nhánh nào và có nguy cơ bị xóa dọn rác (garbage collection).

### Cách xử lý:
- **Nếu chưa commit gì hoặc muốn bỏ qua các thay đổi vừa nghịch:**
  ```bash
  # Quay lại nhánh chính an toàn
  git switch main
  ```
- **Nếu đã lỡ tạo một số commit và muốn LƯU LẠI chúng:**
  ```bash
  # Tạo ngay một nhánh mới từ vị trí hiện tại để lưu giữ các commit
  git switch -c feature/saved-work
  ```

---

## 4. Xóa file nhạy cảm / file rác đã trót commit

### Tình huống: Trót commit file cấu hình (`.env`) hoặc thư mục lớn (`node_modules`)
Bạn muốn xóa file đó khỏi Git nhưng **vẫn giữ lại file trên ổ đĩa máy tính**:

```bash
# 1. Bỏ theo dõi file nhưng giữ nguyên trên đĩa
git rm --cached .env

# Hoặc bỏ theo dõi cả thư mục
git rm -r --cached apps/web/node_modules/

# 2. Thêm file đó vào .gitignore để không bao giờ bị track lại
echo ".env" >> .gitignore

# 3. Commit thay đổi này
git commit -m "chore: remove .env from git tracking and add to .gitignore"
```

> **LƯU Ý BẢO MẬT:** Nếu bạn đã lỡ commit mật khẩu, khóa bí mật (API Key, Database Password) lên GitHub Remote, file đó vẫn nằm trong lịch sử commit cũ. Bạn **PHẢI thu hồi/đổi mới khóa API đó ngay lập tức** vì các bot quét trên Internet có thể đã đọc được!

---

## 5. Khắc phục lỗi ngắt dòng CRLF và LF trên Windows

### Triệu chứng:
```text
warning: LF will be replaced by CRLF in ...
# hoặc
warning: CRLF will be replaced by LF in ...
```

### Nguyên nhân:
Windows sử dụng ký tự kết thúc dòng `CRLF` (`\r\n`), trong khi Linux và macOS sử dụng `LF` (`\n`). Khi đồng đội dùng các OS khác nhau, Git có thể báo toàn bộ các dòng trong file đều bị thay đổi chỉ vì ký tự xuống dòng.

### Cách xử lý:
Thiết lập tự động chuẩn hóa:
```powershell
# Trên máy Windows, chạy lệnh:
git config --global core.autocrlf true
```

Tạo file chuẩn `.gitattributes` ở thư mục gốc dự án:
```gitattributes
# Tự động chuẩn hóa kết thúc dòng cho các tệp văn bản
* text=auto

# Ép buộc sử dụng LF cho scripts shell và mã nguồn
*.py text eol=lf
*.ts text eol=lf
*.tsx text eol=lf
*.js text eol=lf
*.sh text eol=lf
```

Sau khi tạo `.gitattributes`, làm mới lại chỉ mục:
```bash
git add --renormalize .
git commit -m "chore: normalize line endings across project"
```

---

## 6. Lỗi xác thực GitHub (Authentication Failed / SSH)

### Triệu chứng:
```text
remote: Support for password authentication was removed on August 13, 2021.
fatal: Authentication failed for 'https://github.com/...'
```

### Cách xử lý:
GitHub không còn cho phép dùng mật khẩu tài khoản để push code qua HTTPS. Bạn cần dùng **Personal Access Token (PAT)** hoặc **SSH Key**.

#### Sử dụng SSH Key (Khuyên dùng):
```bash
# 1. Kiểm tra xem máy đã có SSH key chưa
ls -la ~/.ssh

# 2. Nếu chưa có, tạo SSH key mới (ED25519)
ssh-keygen -t ed25519 -C "your_email@example.com"

# 3. Copy nội dung public key và thêm vào GitHub Settings > SSH Keys
# Windows (PowerShell):
Get-Content ~/.ssh/id_ed25519.pub | Set-Clipboard

# 4. Kiểm tra kết nối tới GitHub
ssh -T git@github.com

# 5. Chuyển remote URL của repo từ HTTPS sang SSH
git remote set-url origin git@github.com:your-org/gdmas.git
```

---

## 7. Bảng tra cứu nhanh "Lỡ tay thì cứu thế nào?"

| Tôi vừa lỡ... | Cách cứu nhanh |
| :--- | :--- |
| **Gõ sai nội dung commit vừa xong** | `git commit --amend -m "thông điệp đúng"` |
| **Quên add 1 file vào commit vừa tạo** | `git add <file>` rồi `git commit --amend --no-edit` |
| **Sửa đổi code nhưng muốn quay về bản cũ** | `git restore <tên_file>` |
| **Lỡ chạy `git add .` nhầm file rác** | `git restore --staged <file>` |
| **Lỡ `reset --hard` mất commit quan trọng** | Dùng `git reflog` tìm hash rồi `git reset --hard HEAD@{n}` |
| **Đang rebase/merge bị xung đột loạn lên** | Huỷ bỏ: `git rebase --abort` hoặc `git merge --abort` |
| **Muốn hủy toàn bộ thay đổi chưa commit** | `git reset --hard HEAD && git clean -fd` |

