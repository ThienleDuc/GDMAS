# Thư Mục Theo Dõi Lỗi & Rủi Ro Kỹ Thuật (Bugs Log)

Thư mục này dùng để lưu trữ các tài liệu, báo cáo chi tiết về lỗi, sự cố phát sinh và giải pháp kỹ thuật phòng ngừa trong quá trình phát triển hệ thống **GDMAS**.

---

## Danh Sách Vấn Đề Đã Nhận Diện & Giải Pháp

1. **Lỗi App Execution Alias trên Windows 10/11:**
   - *Triệu chứng:* Lệnh `python` bị chuyển hướng mở Microsoft Store.
   - *Giải pháp:* Sử dụng `uv run python` để đảm bảo thực thi trong đúng virtual environment.
2. **Xung đột Port 5432 của PostgreSQL:**
   - *Triệu chứng:* Lỗi `port is already allocated` khi bật Docker.
   - *Giải pháp:* Dừng service postgres máy host (`Stop-Service postgresql*`) hoặc đổi port chuyển tiếp sang `5433` trong `.env`.
3. **Trùng lặp sự kiện địa chấn khi Ingestion chạy định kỳ:**
   - *Triệu chứng:* Nạp lại dữ liệu cũ đã có trong DB.
   - *Giải pháp:* Sử dụng `INSERT ... ON CONFLICT (id) DO UPDATE` (Idempotent Upsert).
4. **Lệch Múi Giờ Timezone (UTC vs Giờ Địa Phương):**
   - *Triệu chứng:* Dữ liệu USGS trả về UTC, hiển thị lệch 7 tiếng so với Việt Nam.
   - *Giải pháp:* Luôn lưu kiểu `TIMESTAMPTZ` trong PostgreSQL và `timezone.utc` trong Python.

