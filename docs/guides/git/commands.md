# Sổ Tay Các Câu Lệnh Git Phổ Biến (Git Command Cheat Sheet)

Tài liệu này tổng hợp đầy đủ các câu lệnh Git thông dụng nhất, được sắp xếp theo từng nhóm tác vụ trong chu trình phát triển phần mềm của dự án GDMAS.

---

## Mục lục
1. [Cấu hình môi trường (Git Config)](#1-cấu-hình-môi-trường-git-config)
2. [Khởi tạo & Clone Repository](#2-khởi-tạo--clone-repository)
3. [Làm việc với File & Staging Area](#3-làm-việc-với-file--staging-area)
4. [Tạo Commit (Lưu vết thay đổi)](#4-tạo-commit-lưu-vết-thay-đổi)
5. [Đồng bộ với Remote Repository (Fetch, Pull, Push)](#5-đồng-bộ-với-remote-repository-fetch-pull-push)
6. [Tạm lưu công việc đang làm dở (Git Stash)](#6-tạm-lưu-công-việc-đang-làm-dở-git-stash)
7. [Xem lịch sử & Truy vết mã nguồn](#7-xem-lịch-sử--truy-vết-mã-nguồn)
8. [Hoàn tác & Hủy thay đổi (Undo Changes)](#8-hoàn-tác--hủy-thay-đổi-undo-changes)
9. [Dọn dẹp file không theo dõi (Git Clean)](#9-dọn-dẹp-file-không-theo-dõi-git-clean)
10. [Aliases hữu ích nên cài đặt](#10-aliases-hữu-ích-nên-cài-đặt)

---

## 1. Cấu hình môi trường (Git Config)

Thiết lập thông tin danh tính và định dạng dòng lệnh trước khi làm việc:

```bash
# Thiết lập tên và email commit (toàn hệ thống)
git config --global user.name "Nguyen Van A"
git config --global user.email "nguyenvana@example.com"

# Thiết lập branch mặc định khi khởi tạo là 'main'
git config --global init.defaultBranch main

# Xử lý ký tự ngắt dòng trên Windows (CRLF vs LF)
# Dành cho Windows:
git config --global core.autocrlf true
# Dành cho Linux/macOS:
git config --global core.autocrlf input

# Xem toàn bộ cấu hình hiện tại và file nguồn
git config --list --show-origin
```

---

## 2. Khởi tạo & Clone Repository

```bash
# Khởi tạo Git repo mới trong thư mục hiện tại
git init

# Clone một repository từ GitHub về máy
git clone https://github.com/your-org/gdmas.git

# Clone vào một thư mục có tên tùy chọn
git clone https://github.com/your-org/gdmas.git my-gdmas-project

# Clone chỉ nhánh chỉ định với độ sâu commit = 1 (tải cực nhanh cho repo nặng)
git clone --depth 1 -b main https://github.com/your-org/gdmas.git
```

---

## 3. Làm việc với File & Staging Area

```bash
# Kiểm tra trạng thái hiện tại (branch, staged, modified, untracked)
git status

# Xem dạng ngắn gọn, súc tích
git status -s

# Đưa một file cụ thể vào Staging Area (chuẩn bị commit)
git add apps/api/main.py

# Đưa toàn bộ thay đổi (thêm, sửa, xóa) trong thư mục hiện tại vào Staging
git add .

# Đưa các file theo mẫu
git add *.py

# Chọn từng phần thay đổi (interactive staging theo từng hunk code)
git add -p

# Xem nội dung code thay đổi ở Working Directory (chưa git add)
git diff

# Xem nội dung code đã nằm trong Staging Area (đã git add)
git diff --staged
```

---

## 4. Tạo Commit (Lưu vết thay đổi)

Dự án áp dụng quy ước [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Tạo commit kèm thông điệp mô tả
git commit -m "feat(api): add endpoint for disaster alert notifications"

# Bỏ qua bước 'git add' đối với các file đã được theo dõi (đã track)
git commit -am "fix(web): resolve dashboard chart rendering issue"

# Gộp thay đổi mới vào commit gần nhất (hoặc sửa message của commit gần nhất)
# LƯU Ý: Không dùng lệnh này nếu commit đã push lên remote chung!
git commit --amend -m "feat(api): update disaster alert response schema"

# Amend mà giữ nguyên commit message cũ
git commit --amend --no-edit
```

### Định dạng Commit Message chuẩn:
```text
<type>(<scope>): <mô tả ngắn ở thì hiện tại>

[tùy chọn: nội dung giải thích chi tiết]

[tùy chọn: liên kết issue, ví dụ Closes #123]
```
- Các kiểu `type` phổ biến: `feat` (tính năng mới), `fix` (sửa lỗi), `docs` (tài liệu), `refactor` (tái cấu trúc), `test` (viết test), `chore` (cấu hình/công cụ).

---

## 5. Đồng bộ với Remote Repository (Fetch, Pull, Push)

```bash
# Xem danh sách các remote URL đã liên kết
git remote -v

# Thêm một remote mới (thường là repo gốc upstream khi fork)
git remote add upstream https://github.com/original-org/gdmas.git

# Tải thông tin commit và branch mới từ remote về nhưng CHƯA gộp vào code hiện tại
git fetch origin

# Tải commit mới và gộp vào branch hiện tại (tương đương fetch + merge)
git pull

# Khuyến nghị: Kéo code mới và rebase nhánh của bạn lên đầu
git pull --rebase origin main

# Đẩy branch lên remote lần đầu tiên và thiết lập upstream tracking (-u)
git push -u origin feature/disaster-map

# Đẩy các commit tiếp theo (sau khi đã set upstream)
git push

# Ép đẩy an toàn (an toàn hơn --force vì không ghi đè nếu remote có commit lạ)
git push --force-with-lease
```

---

## 6. Tạm lưu công việc đang làm dở (Git Stash)

Khi bạn cần chuyển nhánh gấp để sửa bug nhưng code hiện tại chưa hoàn thiện để commit:

```bash
# Lưu toàn bộ thay đổi chưa commit vào ngăn xếp stash
git stash

# Lưu stash kèm thông điệp ghi nhớ
git stash push -m "WIP: dang lam do xu ly ban do"

# Lưu cả những file mới chưa được track (-u / --include-untracked)
git stash -u

# Xem danh sách các bản stash đang lưu
git stash list

# Xem chi tiết nội dung thay đổi trong bản stash gần nhất
git stash show -p

# Lấy lại bản stash gần nhất và XÓA khỏi danh sách stash
git stash pop

# Lấy lại bản stash mà KHÔNG xóa khỏi danh sách
git stash apply stash@{0}

# Xóa một bản stash cụ thể
git stash drop stash@{0}

# Xóa toàn bộ danh sách stash
git stash clear
```

---

## 7. Xem lịch sử & Truy vết mã nguồn

```bash
# Xem lịch sử commit dạng danh sách đầy đủ
git log

# Xem lịch sử rút gọn, mỗi commit 1 dòng
git log --oneline

# Xem lịch sử có sơ đồ cây nhánh và màu sắc trực quan (CỰC KỲ HỮU ÍCH)
git log --graph --oneline --decorate --all

# Xem 5 commit gần nhất kèm thống kê file thay đổi
git log -n 5 --stat

# Xem lịch sử thay đổi của riêng một file cụ thể
git log -p apps/api/pyproject.toml

# Xem chi tiết một commit cụ thể (thay đổi gì, ai commit, khi nào)
git show <commit_hash>

# Xem ai đã viết từng dòng code trong một file cụ thể
git blame apps/api/main.py
```

---

## 8. Hoàn tác & Hủy thay đổi (Undo Changes)

```bash
# Hủy các thay đổi trong một file chưa đưa vào Staging (khôi phục trạng thái cũ)
git restore apps/api/main.py

# Đưa file ra khỏi Staging Area về lại Working Directory (Unstage)
git restore --staged apps/api/main.py

# Tạo một commit mới đảo ngược lại toàn bộ thay đổi của một commit cũ (AN TOÀN NHẤT KHI ĐÃ PUSH)
git revert <commit_hash>

# Di chuyển HEAD về commit cũ nhưng GIỮ NGUYÊN các thay đổi ở Working Directory
git reset --soft HEAD~1

# Di chuyển HEAD về commit cũ và unstage mọi thứ (Mixed - mặc định)
git reset HEAD~1

# NGUY HIỂM: Xóa sạch toàn bộ thay đổi và đưa mã nguồn về đúng commit chỉ định
git reset --hard HEAD~1
```

---

## 9. Dọn dẹp file không theo dõi (Git Clean)

Dọn dẹp các file rác phát sinh trong quá trình build hoặc test mà không nằm trong `.gitignore`:

```bash
# Chạy thử nghiệm (Dry run): xem trước danh sách file sẽ bị xóa
git clean -nd

# Xóa vĩnh viễn các file không theo dõi (-f) và thư mục (-d)
git clean -fd

# Xóa cả những file nằm trong .gitignore (-x)
git clean -fdx
```

---

## 10. Aliases hữu ích nên cài đặt

Thêm các alias sau vào Git config để gõ lệnh siêu nhanh:

```bash
# Log dạng đồ họa đẹp mắt: 'git lg'
git config --global alias.lg "log --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit"

# Status gọn: 'git st'
git config --global alias.st "status -sb"

# Checkout / Switch: 'git co', 'git br'
git config --global alias.co checkout
git config --global alias.br branch

# Commit: 'git cm'
git config --global alias.cm "commit -m"
```

