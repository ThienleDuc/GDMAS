# Bảng Tra Cứu Quy Ước Nhánh & Commit Git (GDMAS Git Conventions)

Tài liệu tham khảo nhanh phục vụ kỹ năng **`git-commit-push`** trong dự án **GDMAS**.

---

## 1. Quy Chuẩn Đặt Tên Nhánh (Branch Naming)

Cú pháp: `<type>/<scope>-<short-description>`

| Tiền tố (`type`) | Phạm vi áp dụng | Ví dụ thực tế |
| :--- | :--- | :--- |
| **`feature/`** | Phát triển tính năng mới | `feature/ingestion-usgs-runner`<br>`feature/web-earthquake-map`<br>`feature/analysis-trend-pattern` |
| **`bugfix/`** | Sửa lỗi trong quá trình phát triển | `bugfix/api-cors-origin`<br>`bugfix/db-upsert-idempotency` |
| **`hotfix/`** | Sửa lỗi khẩn cấp trực tiếp từ `main` | `hotfix/postgres-port-conflict` |
| **`docs/`** | Cập nhật hoặc viết mới tài liệu | `docs/update-setup-guide`<br>`docs/api-specifications` |
| **`refactor/`** | Tái cấu trúc code (không đổi tính năng) | `refactor/db-connection-pool` |
| **`test/`** | Bổ sung hoặc cải thiện test cases | `test/ingestion-mock-usgs` |

---

## 2. Quy Chuẩn Conventional Commits

Cú pháp: `<type>(<scope>): <subject>`

### Bảng Phân Loại Types
- **`feat`:** Thêm tính năng mới
- **`fix`:** Sửa lỗi
- **`docs`:** Thay đổi tài liệu
- **`style`:** Định dạng mã nguồn (khoảng trắng, format)
- **`refactor`:** Tái cấu trúc mã nguồn
- **`perf`:** Cải thiện hiệu năng
- **`test`:** Thêm hoặc sửa đổi kiểm thử
- **`chore`:** Tác vụ linh tinh (dependencies, config, build)

### Bảng Scopes Phổ Biến
- **`api`:** Máy chủ Database REST API & Routes
- **`web`:** Giao diện người dùng React, biểu đồ Recharts, bản đồ Leaflet
- **`ingestion`:** Tiến trình quét và nạp dữ liệu USGS
- **`analysis`:** Xử lý và tính toán 6 patterns chuỗi thời gian
- **`clustering`:** Phân cụm không gian DBSCAN / KMeans
- **`prediction`:** Mô hình hồi quy $t+1$ và phân loại rủi ro
- **`db`:** PostgreSQL, kết nối SQLAlchemy, Alembic migrations
- **`docker`:** Dockerfile, docker-compose.yml
- **`docs`:** Thư mục docs/
- **`setup`:** Thiết lập môi trường và cấu hình local

---

## 3. Các Ví Dụ Mẫu Chuẩn

```bash
# Thêm tính năng:
git commit -m "feat(ingestion): add retry mechanism with exponential backoff"
git commit -m "feat(web): render earthquake markers on leaflet map"

# Sửa lỗi:
git commit -m "fix(db): resolve unique constraint on earthquake id upsert"
git commit -m "fix(api): fix datetime timezone serialization to utc"

# Cập nhật tài liệu:
git commit -m "docs(setup): specify hardware requirements and local setup commands"
git commit -m "docs(api): document sse streaming event structure"

# Cấu hình & Dọn dẹp:
git commit -m "chore(deps): add statsmodels and scikit-learn to pyproject"
```

---

## 4. Nguyên Tắc Vàng (Gold Rules)

1. **Tuyệt đối không commit trực tiếp lên `main`** — Mọi thay đổi phải đi qua nhánh riêng (`feature/`, `docs/`, `bugfix/`) và tạo Pull Request vào `develop`.
2. **Không commit tệp bí mật / nhạy cảm** — File `.env` chứa mật khẩu DB phải luôn nằm trong `.gitignore`.
3. **Commit nguyên tử (Atomic Commits)** — Mỗi commit chỉ giải quyết một vấn đề cụ thể, không dồn tất cả các thay đổi không liên quan vào 1 commit.
