# Cổng Thông Tin & Mục Lục Tài Liệu Dự Án GDMAS

Chào mừng bạn đến với trung tâm lưu trữ và tra cứu tài liệu kỹ thuật của dự án **GDMAS** (Global Disaster Monitoring & Analysis System) — Hệ thống giám sát, phân tích chuỗi thời gian và dự báo thiên tai địa chấn toàn cầu.

---

## 🗺️ Bản Đồ Cấu Trúc Tài Liệu (Documentation Map)

Toàn bộ hệ thống tài liệu được chuẩn hóa thành 6 trụ cột kiến thức chính:

```
docs/
├── README.md                          <-- BẠN ĐANG Ở ĐÂY (Mục lục trung tâm)
├── setup.md                           # Sổ tay thiết lập môi trường từ A - Z
├── workflow.md                        # Sổ tay vận hành hệ thống 7 Terminals
├── quyuocchung.md                     # Quy ước chung, triết lý OCP & 6 Patterns
├── tailieukientructuAI.md             # Tài liệu kiến trúc tham chiếu tổng hợp
├── yeucaubatbuoc.md                   # Bảng đối chiếu yêu cầu cốt lõi của đồ án
│
├── api/
│   └── API.md                         # Đặc tả toàn diện REST API v1 & SSE stream
│
├── architecture/
│   ├── SAD.md                         # Thiết kế Kiến trúc Hệ thống (System Architecture)
│   └── ERD.md                         # Thiết kế Thực thể Dữ liệu (Entity Relationship)
│
├── development/
│   ├── branch-conventions.md          # Quy tắc đặt tên nhánh Git & Local Test Suite
│   ├── coding-conventions.md          # Tiêu chuẩn viết mã Python & React TS
│   └── team-workflow.md               # Quy trình làm việc nhóm, PR & Definition of Done
│
├── guides/                            # Sổ tay kỹ thuật chuyên sâu theo công nghệ
│   ├── docker/
│   │   ├── commands.md                # Cheatsheet Docker CLI cơ bản & nâng cao
│   │   ├── compose.md                 # Hướng dẫn Docker Compose V2
│   │   ├── volumes.md                 # Quản lý Volume, Backup & Restore
│   │   └── troubleshooting.md         # Khắc phục sự cố Docker, xung đột Port
│   ├── git/
│   │   ├── commands.md                # Cheatsheet Git CLI & Conventional Commits
│   │   ├── branching.md               # Chiến lược phân nhánh & Rebase
│   │   ├── pull-request.md            # Quy trình gửi & review PR qua GitHub CLI / Web
│   │   └── troubleshooting.md         # Cứu nguy Commit, Git Reflog, Detached HEAD
│   ├── python/
│   │   ├── uv-commands.md             # Hướng dẫn quản lý virtualenv & gói bằng UV
│   │   ├── dependencies.md            # Danh mục thư viện Python Backend
│   │   └── troubleshooting.md         # Khắc phục lỗi Python Windows/Linux & Async
│   ├── database/
│   │   ├── postgres-commands.md       # Lệnh psql, backup pg_dump & tối ưu index
│   │   ├── alembic-commands.md        # Lệnh migration, upgrade, rollback với Alembic
│   │   └── troubleshooting.md         # Xử lý lock, xung đột port & connection pool
│   └── frontend/
│       ├── development.md             # Kiến trúc Frontend, UI thẩm mỹ & 6 Patterns
│       └── npm-commands.md            # Cheatsheet lệnh PNPM/NPM cho React/Vite
│
└── testing/
    ├── TESTING.md                     # Chiến lược kiểm thử tự động & Test Pyramid
    └── test-cases.md                  # Danh mục chi tiết các ca kiểm thử (TC-Matrix)
```

---

## 📚 Bảng Tra Cứu Tài Liệu Chi Tiết

### 1. Khởi Tạo & Vận Hành Nhanh
- [setup.md](file:///D:/KHDLKPDL/GDMAS/docs/setup.md): Hướng dẫn từng bước thiết lập môi trường máy phát triển, cấu hình `.env`, kịch bản quét tự động PowerShell/Bash và smoke test.
- [workflow.md](file:///D:/KHDLKPDL/GDMAS/docs/workflow.md): Sổ tay vận hành mô hình 7 Terminals độc lập, sơ đồ luồng dữ liệu, lịch chạy định kỳ và xử lý sự cố runtime.

### 2. Kiến Trúc & Thiết Kế Dữ Liệu
- [architecture/SAD.md](file:///D:/KHDLKPDL/GDMAS/docs/architecture/SAD.md): Thiết kế kiến trúc tổng thể, mô hình 7 khối dịch vụ, cơ chế Ingestion thuần Python, phân tích chuỗi thời gian và luồng SSE.
- [architecture/ERD.md](file:///D:/KHDLKPDL/GDMAS/docs/architecture/ERD.md): Thiết kế cơ sở dữ liệu chi tiết, sơ đồ quan hệ Mermaid, từ điển dữ liệu 7 bảng, chiến lược đánh chỉ mục và câu lệnh SQL Upsert.
- [tailieukientructuAI.md](file:///D:/KHDLKPDL/GDMAS/docs/tailieukientructuAI.md): Tài liệu kiến trúc toàn cảnh đã tinh giản cấu trúc thư mục, loại bỏ hoàn toàn n8n và GitHub Actions.
- [yeucaubatbuoc.md](file:///D:/KHDLKPDL/GDMAS/docs/yeucaubatbuoc.md): Bảng đối chiếu yêu cầu bắt buộc của đồ án (6 Patterns, Time-Series, Microservices, Thẩm mỹ cao).

### 3. Giao Tiếp Hệ Thống & Giao Diện API
- [api/API.md](file:///D:/KHDLKPDL/GDMAS/docs/api/API.md): Đặc tả kỹ thuật đầy đủ cho Database REST API v1: Health, Earthquake Queries, 6 Patterns chuỗi thời gian, Phân cụm không gian và luồng Server-Sent Events (SSE).

### 4. Quy Ước Phát Triển & Làm Việc Nhóm
- [quyuocchung.md](file:///D:/KHDLKPDL/GDMAS/docs/quyuocchung.md): 35 điều khoản quy ước phát triển cốt lõi, nguyên tắc Open-Closed Principle (không sửa mã nguồn cũ - chỉ bổ sung mới).
- [development/branch-conventions.md](file:///D:/KHDLKPDL/GDMAS/docs/development/branch-conventions.md): Quy ước đặt tên nhánh (`feat/`, `fix/`, `docs/`), vòng đời nhánh và kích hoạt Local Test Suite.
- [development/coding-conventions.md](file:///D:/KHDLKPDL/GDMAS/docs/development/coding-conventions.md): Tiêu chuẩn viết code Python (Ruff, Mapped Type Hints) và React TypeScript (High Aesthetics, Clean Code).
- [development/team-workflow.md](file:///D:/KHDLKPDL/GDMAS/docs/development/team-workflow.md): Phân công trách nhiệm 7 Terminals, quy trình gửi và đánh giá Pull Request, tiêu chuẩn hoàn thành Definition of Done (DoD).

### 5. Sổ Tay Kỹ Thuật (Tooling & Technology Guides)

| Công nghệ | Sổ tay Lệnh CLI | Sổ tay Chuyên đề | Sổ tay Xử lý Sự cố |
| :--- | :--- | :--- | :--- |
| **Docker** | [commands.md](file:///D:/KHDLKPDL/GDMAS/docs/guides/docker/commands.md) | [compose.md](file:///D:/KHDLKPDL/GDMAS/docs/guides/docker/compose.md) \| [volumes.md](file:///D:/KHDLKPDL/GDMAS/docs/guides/docker/volumes.md) | [troubleshooting.md](file:///D:/KHDLKPDL/GDMAS/docs/guides/docker/troubleshooting.md) |
| **Git** | [commands.md](file:///D:/KHDLKPDL/GDMAS/docs/guides/git/commands.md) | [branching.md](file:///D:/KHDLKPDL/GDMAS/docs/guides/git/branching.md) \| [pull-request.md](file:///D:/KHDLKPDL/GDMAS/docs/guides/git/pull-request.md) | [troubleshooting.md](file:///D:/KHDLKPDL/GDMAS/docs/guides/git/troubleshooting.md) |
| **Python / UV** | [uv-commands.md](file:///D:/KHDLKPDL/GDMAS/docs/guides/python/uv-commands.md) | [dependencies.md](file:///D:/KHDLKPDL/GDMAS/docs/guides/python/dependencies.md) | [troubleshooting.md](file:///D:/KHDLKPDL/GDMAS/docs/guides/python/troubleshooting.md) |
| **Postgres / DB** | [postgres-commands.md](file:///D:/KHDLKPDL/GDMAS/docs/guides/database/postgres-commands.md) | [alembic-commands.md](file:///D:/KHDLKPDL/GDMAS/docs/guides/database/alembic-commands.md) | [troubleshooting.md](file:///D:/KHDLKPDL/GDMAS/docs/guides/database/troubleshooting.md) |
| **Frontend / Web**| [npm-commands.md](file:///D:/KHDLKPDL/GDMAS/docs/guides/frontend/npm-commands.md) | [development.md](file:///D:/KHDLKPDL/GDMAS/docs/guides/frontend/development.md) | [troubleshooting.md](file:///D:/KHDLKPDL/GDMAS/docs/guides/docker/troubleshooting.md) |

### 6. Kiểm Thử & Đảm Bảo Chất Lượng
- [testing/TESTING.md](file:///D:/KHDLKPDL/GDMAS/docs/testing/TESTING.md): Chiến lược kim tự tháp kiểm thử, kịch bản Local Test Suite `scripts/test.sh` và ngưỡng bao phủ mã nguồn 70%.
- [testing/test-cases.md](file:///D:/KHDLKPDL/GDMAS/docs/testing/test-cases.md): Ma trận 17 trường hợp kiểm thử cụ thể cho Ingestion, Analysis, 6 Patterns, Clustering, Prediction, API và UI.

