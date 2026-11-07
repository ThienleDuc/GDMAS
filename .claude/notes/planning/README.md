# Thư Mục Bộ Nhớ Ngữ Cảnh Quy Hoạch Cục Bộ (.claude/notes/planning/)

Thư mục này là **không gian lưu trữ cục bộ (Local Context Cache)** được sử dụng bởi kỹ năng `generate-planning` trong hệ thống **GDMAS**.

> [!IMPORTANT]
> - **Chính sách Git (.gitignore):** Toàn bộ các tệp cache bên trong thư mục này (như `planning-context-cache.md`) được cấu hình bỏ qua trong `.gitignore` để không làm ô nhiễm repository và bảo vệ tính tinh gọn của dự án.
> - **Chức năng:** Lưu trữ bản tóm tắt và nén ngữ cảnh kỹ thuật thu thập từ các tài liệu đầu vào (như `docs/yeucaubatbuoc.md`, `docs/tailieukientructuAI.md`, `docs/api/API.md`, v.v.).
> - **Cơ chế cập nhật:** Kỹ năng `generate-planning` chỉ cập nhật mới tệp cache khi phát hiện tài liệu đầu vào có sự thay đổi nội dung; nếu không thay đổi, dữ liệu cache cũ sẽ được tái sử dụng để tiết kiệm tối đa Token và thời gian xử lý.

