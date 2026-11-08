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
├── task-assignment.md                 # Bảng phân công công việc 4 Devs & Vai trò AI Agents
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
│   ├── frontend/
│   │   ├── development.md             # Kiến trúc Frontend, UI thẩm mỹ & 6 Patterns
│   │   └── npm-commands.md            # Cheatsheet lệnh PNPM/NPM cho React/Vite
│   └── skills/                        # Sổ tay hướng dẫn 9 kỹ năng AI Agent theo ngữ cảnh
│       ├── README.md                  # Bản đồ điều hướng, Ma trận 9 kỹ năng
│       ├── spec-driven-workflow.md    # Ngữ cảnh 1: Tính năng lớn & Thay đổi kiến trúc
│       ├── fast-track-workflow.md     # Ngữ cảnh 2: Sửa lỗi nhanh & Tác vụ thường nhật
│       ├── code-integrity-audit.md    # Ngữ cảnh 3: Thẩm định an toàn mã nguồn
│       └── git-automation.md          # Ngữ cảnh 4: Quản lý nhánh & Commit GitHub
│
├── planning/                          # Kế hoạch quy hoạch 3 trụ cột (Features - UI - Testing)
│   ├── features/                      # 7 Bản đặc tả chức năng tương ứng 7 Terminals
│   │   ├── README.md                  # Bản đồ 7 chức năng & Ma trận trạng thái
│   │   ├── TEMPLATE.md                # Khuôn mẫu đặc tả chức năng chuẩn GDMAS
│   │   ├── 01-database-storage.md     # T1: CSDL PostgreSQL 16 & Alembic Migrations
│   │   ├── 02-usgs-ingestion.md       # T2: Ingestion Worker nạp USGS 5 phút/lần
│   │   ├── 03-timeseries-analysis.md  # T3: Phân tích 4 Patterns chuỗi thời gian
│   │   ├── 04-spatial-clustering.md   # T4: Gom cụm không gian địa chấn DBSCAN
│   │   ├── 05-seismic-prediction.md   # T5: Mô hình dự báo định lượng & rủi ro (t+1)
│   │   ├── 06-api-realtime-sse.md     # T6: FastAPI REST & Kênh SSE Realtime
│   │   └── 07-interactive-web-client.md # T7: Web Dashboard Dark Mode & Bản đồ Leaflet
│   ├── ui/                            # Kế hoạch & Đặc tả giao diện theo bố cục (2 Tầng)
│   │   ├── README.md                  # Danh mục & Bản đồ sitemap giao diện (UI Catalog)
│   │   ├── TEMPLATE.md                # Khuôn mẫu quy hoạch UI 2 tầng (Layout & Views)
│   │   ├── 00-master-app-shell.md     # Tầng 1: Master App Shell & Design Tokens
│   │   ├── 01-dashboard-view.md       # Tầng 2: View 01 - Dashboard Điều Hành Tổng Quan
│   │   ├── 02-earthquakes-view.md     # Tầng 2: View 02 - Danh Sách & Bộ Lọc Đa Chiều
│   │   ├── 03-analytics-view.md       # Tầng 2: View 03 - 6 Patterns Chuỗi Thời Gian
│   │   ├── 04-clusters-view.md        # Tầng 2: View 04 - Bản Đồ Cụm Không Gian DBSCAN
│   │   └── 05-system-view.md          # Tầng 2: View 05 - Giám Sát 7 Terminals & Demo §4
│   └── testing/                       # Kế hoạch & Đặc tả kiểm thử định hướng chất lượng
│       ├── README.md                  # Danh mục 12 ca kiểm thử & Ma trận phân hệ
│       ├── TEMPLATE.md                # Khuôn mẫu đặc tả kiểm thử dùng để sinh code test
│       ├── 01-test-database-storage.md # TC-DB-01: Kiểm thử CSDL PostgreSQL 16 & Upsert
│       ├── 02-test-usgs-ingestion.md  # TC-ING-01: Kiểm thử nạp USGS 5 phút & Service Runs
│       ├── 03-test-timeseries-analysis.md # TC-PAT-01: Kiểm thử 4 Patterns chuỗi thời gian
│       ├── 04-test-spatial-clustering.md # TC-PAT-04: Kiểm thử phân cụm không gian DBSCAN
│       ├── 05-test-seismic-prediction.md # TC-PAT-05: Kiểm thử dự báo định lượng & phân loại t+1
│       ├── 06-test-api-realtime-sse.md # TC-API-01: Kiểm thử REST Envelope & Kênh SSE
│       ├── 07-test-master-app-shell.md # TC-UI-01: Kiểm thử Master App Shell & Dark Tokens
│       ├── 08-test-dashboard-view.md  # TC-UI-02: Kiểm thử View 01 - Dashboard 4 KPI Cards
│       ├── 09-test-earthquakes-view.md # TC-UI-03: Kiểm thử View 02 - Lọc Richter Debounce
│       ├── 10-test-analytics-view.md  # TC-UI-04: Kiểm thử View 03 - 6 Patterns Zoom Brush
│       ├── 11-test-clusters-view.md   # TC-UI-05: Kiểm thử View 04 - Leaflet DBSCAN Map
│       └── 12-test-system-demo-view.md # TC-UI-06/RES-01: Kiểm thử 7 Terminals & Demo §4
│
└── testing/
    ├── TESTING.md                     # Chiến lược kiểm thử tự động & Test Pyramid
    └── test-cases.md                  # Danh mục chi tiết các ca kiểm thử (TC-Matrix)
```

---

## 📚 Bảng Tra Cứu Tài Liệu Chi Tiết

### 1. Khởi Tạo & Vận Hành Nhanh
- [setup.md](GDMAS/docs/setup.md): Hướng dẫn từng bước thiết lập môi trường máy phát triển, cấu hình `.env`, kịch bản quét tự động PowerShell/Bash và smoke test.
- [workflow.md](GDMAS/docs/workflow.md): Sổ tay vận hành mô hình 7 Terminals độc lập, sơ đồ luồng dữ liệu, lịch chạy định kỳ và xử lý sự cố runtime.

### 2. Kiến Trúc & Thiết Kế Dữ Liệu
- [architecture/SAD.md](GDMAS/docs/architecture/SAD.md): Thiết kế kiến trúc tổng thể, mô hình 7 khối dịch vụ, cơ chế Ingestion thuần Python, phân tích chuỗi thời gian và luồng SSE.
- [architecture/ERD.md](GDMAS/docs/architecture/ERD.md): Thiết kế cơ sở dữ liệu chi tiết, sơ đồ quan hệ Mermaid, từ điển dữ liệu 7 bảng, chiến lược đánh chỉ mục và câu lệnh SQL Upsert.
- [tailieukientructuAI.md](GDMAS/docs/tailieukientructuAI.md): Tài liệu kiến trúc toàn cảnh đã tinh giản cấu trúc thư mục, loại bỏ hoàn toàn n8n và GitHub Actions.
- [yeucaubatbuoc.md](GDMAS/docs/yeucaubatbuoc.md): Bảng đối chiếu yêu cầu bắt buộc của đồ án (6 Patterns, Time-Series, Microservices, Thẩm mỹ cao).

### 3. Giao Tiếp Hệ Thống & Giao Diện API
- [api/API.md](GDMAS/docs/api/API.md): Đặc tả kỹ thuật đầy đủ cho Database REST API v1: Health, Earthquake Queries, 6 Patterns chuỗi thời gian, Phân cụm không gian và luồng Server-Sent Events (SSE).

### 4. Quy Ước Phát Triển & Làm Việc Nhóm
- [task-assignment.md](GDMAS/docs/task-assignment.md): Bảng phân công công việc chi tiết cho 4 thành viên (1 Frontend, 3 Backend), định vị vai trò cho AI Agents và 4 lộ trình kế hoạch triển khai cá nhân độc lập dựa trên 3 trụ cột quy hoạch.
- [quyuocchung.md](GDMAS/docs/quyuocchung.md): 35 điều khoản quy ước phát triển cốt lõi, nguyên tắc Open-Closed Principle (không sửa mã nguồn cũ - chỉ bổ sung mới).
- [development/branch-conventions.md](GDMAS/docs/development/branch-conventions.md): Quy ước đặt tên nhánh (`feat/`, `fix/`, `docs/`), vòng đời nhánh và kích hoạt Local Test Suite.
- [development/coding-conventions.md](GDMAS/docs/development/coding-conventions.md): Tiêu chuẩn viết code Python (Ruff, Mapped Type Hints) và React TypeScript (High Aesthetics, Clean Code).
- [development/team-workflow.md](GDMAS/docs/development/team-workflow.md): Phân công trách nhiệm 7 Terminals, quy trình gửi và đánh giá Pull Request, tiêu chuẩn hoàn thành Definition of Done (DoD).

### 5. Sổ Tay Kỹ Thuật (Tooling & Technology Guides)

| Công nghệ | Sổ tay Lệnh CLI | Sổ tay Chuyên đề | Sổ tay Xử lý Sự cố |
| :--- | :--- | :--- | :--- |
| **Docker** | [commands.md](GDMAS/docs/guides/docker/commands.md) | [compose.md](GDMAS/docs/guides/docker/compose.md) \| [volumes.md](GDMAS/docs/guides/docker/volumes.md) | [troubleshooting.md](GDMAS/docs/guides/docker/troubleshooting.md) |
| **Git** | [commands.md](GDMAS/docs/guides/git/commands.md) | [branching.md](GDMAS/docs/guides/git/branching.md) \| [pull-request.md](GDMAS/docs/guides/git/pull-request.md) | [troubleshooting.md](GDMAS/docs/guides/git/troubleshooting.md) |
| **Python / UV** | [uv-commands.md](GDMAS/docs/guides/python/uv-commands.md) | [dependencies.md](GDMAS/docs/guides/python/dependencies.md) | [troubleshooting.md](GDMAS/docs/guides/python/troubleshooting.md) |
| **Postgres / DB** | [postgres-commands.md](GDMAS/docs/guides/database/postgres-commands.md) | [alembic-commands.md](GDMAS/docs/guides/database/alembic-commands.md) | [troubleshooting.md](GDMAS/docs/guides/database/troubleshooting.md) |
| **Frontend / Web**| [npm-commands.md](GDMAS/docs/guides/frontend/npm-commands.md) | [development.md](GDMAS/docs/guides/frontend/development.md) | [troubleshooting.md](GDMAS/docs/guides/docker/troubleshooting.md) |

### 6. Kiểm Thử & Đảm Bảo Chất Lượng
- [testing/TESTING.md](GDMAS/docs/testing/TESTING.md): Chiến lược kim tự tháp kiểm thử, kịch bản Local Test Suite `scripts/test.sh` và ngưỡng bao phủ mã nguồn 70%.
- [testing/test-cases.md](GDMAS/docs/testing/test-cases.md): Ma trận 17 trường hợp kiểm thử cụ thể cho Ingestion, Analysis, 6 Patterns, Clustering, Prediction, API và UI.

