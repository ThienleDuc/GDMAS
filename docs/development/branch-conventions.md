# QUY ƯỚC QUẢN LÝ NHÁNH VÀ CHIẾN LƯỢC PHÂN NHÁNH (GIT BRANCH CONVENTIONS)

# HỆ THỐNG GIÁM SÁT VÀ PHÂN TÍCH THIÊN TAI TOÀN CẦU (GDMAS)

- **Phạm vi áp dụng:** Toàn bộ thành viên phát triển dự án GDMAS
- **Nền tảng quản lý:** GitHub Repository
- **Nguyên tắc nền tảng:** **Không sửa mã nguồn hiện có – Chỉ bổ sung thêm mới (Open-Closed Principle)**

---

## Mục lục
1. [Mô hình Phân nhánh Tổng thể (Branching Model)](#1-mô-hình-phân-nhánh-tổng-thể-branching-model)
2. [Quy chuẩn Đặt tên Nhánh](#2-quy-chuẩn-đặt-tên-nhánh)
3. [Vòng đời của một Nhánh (Branch Lifecycle)](#3-vòng-đời-của-một-nhánh-branch-lifecycle)
4. [Chính sách Bảo vệ Nhánh (Branch Protection Rules)](#4-chính-sách-bảo-vệ-nhánh-branch-protection-rules)
5. [Sổ tay Lệnh Git Thao tác Nhánh](#5-sổ-tay-lệnh-git-thao-tác-nhánh)

---

## 1. Mô hình Phân nhánh Tổng thể (Branching Model)

Dự án áp dụng mô hình phân nhánh rút gọn dựa trên **Git Flow**, tối ưu cho nhóm sinh viên/nhà phát triển phối hợp phát triển nhanh:

```text
main (Release / Stable)
 │
 └──► develop (Integration Branch)
       │
       ├──► feature/ingestion-usgs-worker   ───(PR + Review)───► develop
       ├──► feature/web-earthquake-map      ───(PR + Review)───► develop
       ├──► feature/analysis-6-patterns     ───(PR + Review)───► develop
       └──► bugfix/db-upsert-conflict       ───(PR + Review)───► develop
```

### Các nhánh dài hạn (Long-lived Branches):
1. **`main`:**
   - Nhánh ổn định cao nhất, chứa mã nguồn đã nghiệm thu, sẵn sàng demo và báo cáo.
   - Tuyệt đối **không được commit trực tiếp** lên nhánh `main`.
   - Chỉ nhận code từ nhánh `develop` thông qua Release Pull Request.
2. **`develop`:**
   - Nhánh tích hợp chính của nhóm trong suốt chu kỳ phát triển.
   - Mọi nhánh tính năng (`feature/`) đều bắt nguồn từ `develop` và merge ngược lại vào `develop`.

---

## 2. Quy chuẩn Đặt tên Nhánh

Mọi nhánh làm việc tạm thời phải tuân theo cấu trúc cú pháp:

```text
<type>/<scope>-<short-description>
```

### Bảng tiền tố phân loại (`type`):
| Tiền tố | Ý nghĩa | Phạm vi áp dụng | Ví dụ thực tế |
| :--- | :--- | :--- | :--- |
| `feature/` | Phát triển tính năng mới | Thêm service runner, API endpoint, UI component, biểu đồ | `feature/api-temporal-endpoint`<br>`feature/web-correlation-heatmap`<br>`feature/ingestion-usgs-runner` |
| `bugfix/` | Sửa lỗi trong phát triển | Sửa lỗi logic trên nhánh `develop` | `bugfix/db-upsert-timestamp`<br>`bugfix/vite-proxy-cors` |
| `hotfix/` | Sửa lỗi khẩn cấp | Sửa lỗi nghiêm trọng phát sinh trực tiếp từ `main` | `hotfix/postgres-port-binding` |
| `docs/` | Bổ sung tài liệu | Cập nhật SAD, ERD, API specs, hướng dẫn setup | `docs/add-api-specification`<br>`docs/update-erd-diagram` |
| `refactor/`| Tinh chỉnh mã nguồn | Tối ưu code mà không thay đổi nghiệp vụ bên ngoài | `refactor/clustering-service-dbscan` |
| `test/` | Kiểm thử chuyên sâu 1 file cụ thể | Checkout nhánh mới trước khi viết unit test offline & log lỗi vào `.agents/notes/bugs/` | `test/2026-11-11-prediction-runner-tai` |
| `chore/` | Cấu hình & Công cụ | Cập nhật docker-compose, linter, dependencies | `chore/update-uv-lock`<br>`chore/setup-docker-compose` |

> **Nguyên tắc cú pháp:** Sử dụng toàn bộ chữ thường (lowercase), các từ cách nhau bởi dấu gạch ngang (`-`), tên mang tính mô tả rõ ràng, không đặt tên chung chung như `test`, `dev1`, `fix`.

---

## 3. Vòng đời của một Nhánh (Branch Lifecycle)

### Bước 1: Tạo nhánh từ `develop` mới nhất
Luôn cập nhật nhánh gốc trước khi tạo nhánh mới:
```bash
git switch develop
git pull origin develop
git switch -c feature/api-temporal-endpoint
```

### Bước 2: Phát triển theo nguyên tắc Open-Closed
- **Không sửa mã nguồn hiện có:** Giữ nguyên các hàm, router và lớp đang chạy ổn định.
- **Bổ sung thêm mới:** Tạo file runner mới, router mới, component biểu đồ mới theo yêu cầu được phân công.
- Commit thường xuyên với thông điệp rõ ràng theo chuẩn Conventional Commits (`feat:`, `fix:`, `docs:`).

### Bước 3: Đồng bộ Merge-Forward trước khi mở Pull Request
Kéo code mới nhất từ `origin/develop` bằng merge-forward (không rebase sau khi đã push để giữ comment PR và tránh force-push):
```bash
./scripts/git-ship.sh update
```
*(Nếu xung đột chạm `contracts/`, `AGENTS.md`, `apps/api/alembic/versions/`, `docs/quyuocchung.md`: dừng giải quyết thủ công hoặc đưa vào danh sách câu hỏi cuối phiên cho nhóm chốt.)*

### Bước 4: Đẩy nhánh lên Remote & Mở Pull Request
```bash
./scripts/git-ship.sh push
```
Tạo Pull Request trên GitHub hướng về nhánh đích `develop`.

### Bước 5: Kiểm tra không xung đột & Hợp nhất (Merge)
- **Không bắt buộc riêng `ThienleDuc`:** bất kỳ thành viên nào đều có thể merge PR vào `develop` sau khi **kiểm tra không có xung đột (`0 conflicts`)** qua `./scripts/git-ship.sh merge` (hoặc GitHub merge check) và đạt validation.
- Xóa nhánh feature sau khi merge thành công.

### Bước 6: Dọn dẹp máy cục bộ
```bash
./scripts/git-ship.sh sync
```

---

## 4. Chính sách Bảo vệ Nhánh (Branch Protection Rules)

Áp dụng trên GitHub Repository:

1. **Bắt buộc kiểm tra không xung đột trước khi Merge (Conflict-Free Gate):** Cấm lệnh `git push` raw trực tiếp lên `main` và `develop` bỏ qua PR/conflict check (chặn bởi `.githooks/` và GitHub Ruleset).
2. **Quyền Merge mở theo điều kiện Không Xung Đột:** Không bắt buộc riêng `@ThienleDuc` duyệt ở `.github/CODEOWNERS` — bất kỳ thành viên nào cũng có thể merge PR khi `0 conflicts` và checks đạt chuẩn.
3. **Bắt buộc vượt qua kiểm thử cục bộ & tạo testcase (`write-testcase`):** Tác giả nhánh phải tạo tài liệu kiểm thử theo [`.agents/notes/testcase/_TEMPLATE.md`](../../.agents/notes/testcase/_TEMPLATE.md) kèm file unit test offline, chạy `uv run pytest` / `pnpm build` và `python3 scripts/notes_index.py --check`. Nếu test 1 file phát hiện lỗi, ghi nhận ngay vào `.agents/notes/bugs/`.
4. **Không cho phép Force Push (`--force`):** Nghiêm cấm ép ghi đè lịch sử trên các nhánh.

---

## 5. Sổ tay Lệnh Git Thao tác Nhánh

| Nhu cầu thao tác | Câu lệnh Git khuyến nghị |
| :--- | :--- |
| Tạo và chuyển sang nhánh mới | `git switch -c feature/your-feature-name` |
| Chuyển đổi giữa các nhánh | `git switch develop` / `git switch -` (về nhánh trước) |
| Xem danh sách nhánh và tracking | `git branch -vv` |
| Xem danh sách cả local và remote | `git branch -a` |
| Đổi tên nhánh hiện tại | `git branch -m feature/new-name` |
| Xóa nhánh an toàn sau khi đã merge | `git branch -d feature/your-feature-name` |
| Buộc xóa nhánh cục bộ | `git branch -D feature/your-feature-name` |
| Xóa nhánh trên GitHub remote | `git push origin --delete feature/your-feature-name` |
| Đồng bộ và dọn dẹp các nhánh đã xóa trên remote | `git fetch origin --prune` |
| Xem nhanh nhánh đã được merge vào develop | `git branch --merged develop` |

