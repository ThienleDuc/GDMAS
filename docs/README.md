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
├── agent-workflow.md                  # Quy trình AI Agent 5 pha, bộ nhớ quyết định & phân quyền
├── git-workflow.md                    # Quy trình Git tự động tới PR & merge khi không xung đột
├── coding-rules.md                    # 7 Bất biến kiến trúc cứng (I1–I7) kèm dấu hiệu vi phạm
├── quyuocchung.md                     # Quy ước chung, triết lý OCP & 6 Patterns
├── architecture.md                    # Tài liệu kiến trúc tham chiếu tổng hợp
├── yeucaubatbuoc.md                   # Bảng đối chiếu yêu cầu cốt lõi của đồ án
├── task/                              # Danh sách task chi tiết cho 4 thành viên (`thien`, `son`, `van`, `tai`)
│   ├── thien.md                       # Task Frontend (Terminal 7)
│   ├── son.md                         # Task Ingestion & Analysis (Terminal 2, 3)
│   ├── van.md                         # Task Database & Clustering DBSCAN (Terminal 1, 4)
│   └── tai.md                         # Task Prediction & REST/SSE API (Terminal 5, 6)
│
├── api/
│   └── API.md                         # Đặc tả toàn diện REST API v1 & SSE stream
│
├── architecture/
│   ├── SAD.md                         # Thiết kế Kiến trúc Hệ thống (System Architecture)
│   └── ERD.md                         # Thiết kế Thực thể Dữ liệu (Entity Relationship)
│
├── development/
│   ├── branch-conventions.md          # Quy tắc đặt tên nhánh Git & kiểm thử
│   ├── coding-conventions.md          # Tiêu chuẩn viết mã Python & React TS
│   └── team-workflow.md               # Quy trình làm việc nhóm, PR & Definition of Done
│
└── guides/                            # Sổ tay kỹ thuật chuyên sâu theo công nghệ
    ├── docker/
    │   ├── commands.md                # Cheatsheet Docker CLI cơ bản & nâng cao
    │   ├── compose.md                 # Hướng dẫn Docker Compose V2
    │   ├── volumes.md                 # Quản lý Volume, Backup & Restore
    │   └── troubleshooting.md         # Khắc phục sự cố Docker, xung đột Port
    ├── git/
    │   ├── commands.md                # Cheatsheet Git CLI & Conventional Commits
    │   ├── branching.md               # Chiến lược phân nhánh & Rebase
    │   ├── pull-request.md            # Quy trình gửi & review PR qua GitHub CLI / Web
    │   └── troubleshooting.md         # Cứu nguy Commit, Git Reflog, Detached HEAD
    ├── python/
    │   ├── uv-commands.md             # Hướng dẫn quản lý virtualenv & gói bằng UV
    │   ├── dependencies.md            # Danh mục thư viện Python Backend
    │   └── troubleshooting.md         # Khắc phục lỗi Python Windows/Linux & Async
    ├── database/
    │   ├── postgres-commands.md       # Lệnh psql, backup pg_dump & tối ưu index
    │   ├── alembic-commands.md        # Lệnh migration, upgrade, rollback với Alembic
    │   └── troubleshooting.md         # Xử lý lock, xung đột port & connection pool
    ├── frontend/
    │   ├── development.md             # Kiến trúc Frontend, UI thẩm mỹ & 6 Patterns
    │   └── npm-commands.md            # Cheatsheet lệnh PNPM/NPM cho React/Vite
    └── skills/                        # Sổ tay hướng dẫn 5 kỹ năng cốt lõi (.agents/skills/)
        ├── README.md                  # Bản đồ điều hướng 5 kỹ năng cốt lõi
        ├── spec-driven-workflow.md    # Ngữ cảnh 1: Spec-Driven & Single-File Test (test/<id>)
        ├── fast-track-workflow.md     # Ngữ cảnh 2: Sửa nhỏ <= 1 file qua review-pr
        ├── code-integrity-audit.md    # Ngữ cảnh 3: Thẩm định project-review (OCP & I1–I7)
        └── git-automation.md          # Ngữ cảnh 4: Tự động hóa Git qua review-pr & git-ship.sh
```

*(Kiểm thử, Testcase & Nhật ký lỗi được quản lý tập trung tại [`.agents/notes/testcase/`](../.agents/notes/testcase/README.md) và [`.agents/notes/bugs/`](../.agents/notes/bugs/README.md).)*

---

## 📚 Bảng Tra Cứu Tài Liệu Chi Tiết

### 1. Khởi Tạo & Vận Hành Nhanh
- [setup.md](setup.md): Hướng dẫn từng bước thiết lập môi trường máy phát triển, cấu hình `.env`, kịch bản quét tự động PowerShell/Bash và smoke test.
- [workflow.md](workflow.md): Sổ tay vận hành mô hình 7 Terminals độc lập, sơ đồ luồng dữ liệu, lịch chạy định kỳ và xử lý sự cố runtime.

### 2. Kiến Trúc & Thiết Kế Dữ liệu
- [architecture/SAD.md](architecture/SAD.md): Thiết kế kiến trúc tổng thể, mô hình 7 khối dịch vụ, cơ chế Ingestion thuần Python, phân tích chuỗi thời gian và luồng SSE.
- [architecture/ERD.md](architecture/ERD.md): Thiết kế cơ sở dữ liệu chi tiết, sơ đồ quan hệ Mermaid, từ điển dữ liệu 7 bảng, chiến lược đánh chỉ mục và câu lệnh SQL Upsert.
- [architecture.md](architecture.md): Tài liệu kiến trúc toàn cảnh đã tinh giản cấu trúc thư mục, loại bỏ hoàn toàn n8n và GitHub Actions.
- [yeucaubatbuoc.md](yeucaubatbuoc.md): Bảng đối chiếu yêu cầu bắt buộc của đồ án (6 Patterns, Time-Series, Microservices, Thẩm mỹ cao).

### 3. Giao Tiếp Hệ Thống & Giao Diện API
- [api/API.md](api/API.md): Đặc tả kỹ thuật đầy đủ cho Database REST API v1: Health, Earthquake Queries, 6 Patterns chuỗi thời gian, Phân cụm không gian và luồng Server-Sent Events (SSE).

### 4. Quy Ước Phát Triển & Làm Việc Nhóm
- [agent-workflow.md](agent-workflow.md): Quy trình AI Agent 5 pha (proposal thả lỏng, sinh đồng thời `implemented/` + `testcase/`, luồng test 1 file `test/<id>`, tự động đẩy PR & merge khi không xung đột).
- [git-workflow.md](git-workflow.md): Quy trình Git với `./scripts/git-ship.sh`, `.githooks/` và thiết lập bảo vệ nhánh trên GitHub.
- [coding-rules.md](coding-rules.md): Bản đặc tả 7 Bất biến kiến trúc cứng (`I1–I7`) dùng để thẩm định tự động.
- Danh sách task 4 thành viên (`docs/task/`): [`thien.md`](task/thien.md), [`son.md`](task/son.md), [`van.md`](task/van.md), [`tai.md`](task/tai.md).
- [quyuocchung.md](quyuocchung.md): 35 điều khoản quy ước phát triển cốt lõi, nguyên tắc Open-Closed Principle (không sửa mã nguồn cũ - chỉ bổ sung mới).
- [development/branch-conventions.md](development/branch-conventions.md): Quy ước đặt tên nhánh (`feat/`, `fix/`, `test/`, `docs/`), vòng đời nhánh và kích hoạt kiểm thử.
- [development/coding-conventions.md](development/coding-conventions.md): Tiêu chuẩn viết code Python (Ruff, Mapped Type Hints) và React TypeScript (High Aesthetics, Clean Code).
- [development/team-workflow.md](development/team-workflow.md): Phân công trách nhiệm 7 Terminals, quy trình gửi và đánh giá Pull Request, tiêu chuẩn hoàn thành Definition of Done (DoD).

### 5. Sổ Tay Kỹ Thuật (Tooling & Technology Guides)

| Công nghệ | Sổ tay Lệnh CLI | Sổ tay Chuyên đề | Sổ tay Xử lý Sự cố |
| :--- | :--- | :--- | :--- |
| **Docker** | [commands.md](guides/docker/commands.md) | [compose.md](guides/docker/compose.md) \| [volumes.md](guides/docker/volumes.md) | [troubleshooting.md](guides/docker/troubleshooting.md) |
| **Git** | [commands.md](guides/git/commands.md) | [branching.md](guides/git/branching.md) \| [pull-request.md](guides/git/pull-request.md) | [troubleshooting.md](guides/git/troubleshooting.md) |
| **Python / UV** | [uv-commands.md](guides/python/uv-commands.md) | [dependencies.md](guides/python/dependencies.md) | [troubleshooting.md](guides/python/troubleshooting.md) |
| **Postgres / DB** | [postgres-commands.md](guides/database/postgres-commands.md) | [alembic-commands.md](guides/database/alembic-commands.md) | [troubleshooting.md](guides/database/troubleshooting.md) |
| **Frontend / Web**| [npm-commands.md](guides/frontend/npm-commands.md) | [development.md](guides/frontend/development.md) | [troubleshooting.md](guides/docker/troubleshooting.md) |

### 6. Kiểm Thử, Testcase & Ghi Nhận Lỗi (`.agents/notes/`)
- [`.agents/notes/testcase/README.md`](../.agents/notes/testcase/README.md) & [`_TEMPLATE.md`](../.agents/notes/testcase/_TEMPLATE.md): Quy chuẩn lưu testcase ghép cặp proposal (`proposal-paired`) và kiểm thử riêng 1 file (`single-file-test`).
- [`.agents/skills/write-testcase/SKILL.md`](../.agents/skills/write-testcase/SKILL.md): Kỹ năng sinh testcase & viết unit test offline tự động.
- [`.agents/notes/bugs/README.md`](../.agents/notes/bugs/README.md): Nhật ký lỗi phát hiện khi kiểm thử (`BUG-<handle>-NNN-<slug>.md`).
- [coding-rules.md](coding-rules.md) & [agent-workflow.md](agent-workflow.md): Nguyên tắc kiểm thử offline 100% (I7) và báo cáo chỉ số qua `python3 scripts/notes_index.py --testcases`.
