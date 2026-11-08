# Thư Mục Quản Lý Bản Ghi Của Agent (.agents/notes)

Thư mục `.agents/notes` là **thư mục cấp cao nhất** dùng để lưu trữ toàn bộ các ghi chú, nhật ký, báo cáo và dữ liệu sinh ra hoặc chỉnh sửa trong quá trình phát triển và vận hành các kỹ năng (AI Skills) của hệ thống **GDMAS**.

---

## 📁 Cấu Trúc Các Thư Mục Con

```text
.agents/notes/
├── README.md               # [Push Git] Tài liệu định nghĩa thư mục cấp cao nhất .agents/notes
├── bugs/                   # [Push Git] Bắt buộc push: Tài liệu truy vết sự cố, bug logs, rủi ro kỹ thuật
│   └── README.md
├── implemented/            # [Push Git] Bắt buộc push: Ghi nhận tính năng & module đã triển khai thành công
│   └── README.md
├── proposed/               # [Push Git] Bắt buộc push: Kế hoạch và tài liệu đề xuất kiến trúc, tính năng kế tiếp
│   └── README.md
├── memory/                 # Bộ nhớ cửa sổ ngữ cảnh tinh gọn cho AI Agent
│   ├── README.md           # [Push Git] Hướng dẫn quản lý memory
│   └── context-memory.md   # [Cục bộ] Snapshot bối cảnh dự án ~60 dòng (tiết kiệm token)
├── changes/                # [Cục bộ] Bỏ qua qua .gitignore: Nhật ký thay đổi & pending-commit.md
│   ├── README.md           # [Push Git] Hướng dẫn sử dụng
│   └── pending-commit.md   # [Cục bộ] Bản ghi commit kế tiếp do skill 'generate-commit' tạo ra
├── planning/               # [Cục bộ] Bỏ qua qua .gitignore: Bộ nhớ ngữ cảnh nén (Context cache) sinh bởi skill 'generate-planning'
│   └── README.md           # [Push Git] Hướng dẫn sử dụng
└── branches/               # [Cục bộ] Bỏ qua qua .gitignore: Bản ghi đề xuất tạo nhánh
    ├── README.md           # [Push Git] Hướng dẫn sử dụng
    └── *.md                # [Cục bộ] Các đề xuất nhánh do skill 'propose-branch' tạo ra
```

---

## 🔒 Quy Ước Đồng Bộ Git (.gitignore Policy)

1. **Bắt buộc theo dõi và push lên Remote Repository:**
   - Toàn bộ thư mục và mọi tệp bên trong:
     - [`.agents/notes/bugs/`](GDMAS/.agents/notes/bugs/)
     - [`.agents/notes/implemented/`](GDMAS/.agents/notes/implemented/)
     - [`.agents/notes/proposed/`](GDMAS/.agents/notes/proposed/)
   - Các tệp tài liệu hướng dẫn cấu trúc: `README.md`.

2. **Chỉ lưu trữ cục bộ (Không push):**
   - Bộ nhớ ngữ cảnh động: [`.agents/notes/memory/context-memory.md`](GDMAS/.agents/notes/memory/context-memory.md).
   - Các bản ghi tạm do AI skill sinh ra trong [`.agents/notes/changes/`](GDMAS/.agents/notes/changes/) (ví dụ: `pending-commit.md`, `source-guard-report.md`).
   - Các bản ghi đề xuất tạo nhánh tạm thời trong [`.agents/notes/branches/`](GDMAS/.agents/notes/branches/) (ví dụ: `feature-*.md`).
