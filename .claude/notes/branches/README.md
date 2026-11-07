# Thư Mục Đề Xuất Phân Nhánh Git (Branch Proposals)

Thư mục này được sử dụng để **lưu trữ các bản đề xuất tên nhánh Git và kế hoạch công việc** được sinh ra tự động từ kỹ năng `propose-branch` dựa trên mô tả công việc (task description) trong dự án **GDMAS**.

---

## 1. Cấu Trúc Thư Mục

```text
.agents/notes/branches/
├── README.md               # Tài liệu định nghĩa và hướng dẫn thư mục
└── *.md                    # [Cục bộ] Các bản đề xuất phân nhánh và kế hoạch chi tiết
```

---

## 2. Quy Cách Bản Ghi Đề Xuất Nhánh

Mỗi khi người dùng đưa ra mô tả công việc, kỹ năng `propose-branch` sẽ phân tích và lưu một bản ghi cục bộ có dạng:

```markdown
# [ĐỀ XUẤT PHÂN NHÁNH: feature/ingestion-usgs-retry]

- **Thời gian đề xuất:** 2026-11-06 22:00:00 (UTC+7)
- **Mô tả công việc:** Bổ sung cơ chế retry với exponential backoff cho tiến trình quét dữ liệu USGS
- **Loại tác vụ (Type):** feature
- **Phạm vi (Scope):** ingestion
- **Nhánh đề xuất:** `feature/ingestion-usgs-retry`
- **Nhánh cơ sở (Base Branch):** `develop` (hoặc `main`)

### Lệnh Git Khởi Tạo:
```bash
git checkout -b feature/ingestion-usgs-retry
```
```

---

## 3. Lưu Trữ Cục Bộ

Tất cả các tệp đề xuất nhánh `.agents/notes/branches/*.md` được cấu hình tự động trong `.gitignore` và chỉ lưu trữ trên máy cá nhân, không bị đẩy lên repository.

