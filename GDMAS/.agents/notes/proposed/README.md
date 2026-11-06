# Thư Mục Kế Hoạch & Đề Xuất Kế Tiếp (Proposed)

Thư mục này dùng để lưu trữ các đề xuất kiến trúc, tài liệu thiết kế tính năng mới và kế hoạch triển khai tiếp theo cho hệ thống **GDMAS**.

---

## Kế Hoạch Triển Khai Tiếp Theo

1. **Giai đoạn Triển khai Backend (`apps/api`):**
   - Hoàn thiện `pyproject.toml` và cài đặt dependencies bằng `uv sync`.
   - Viết code kết nối DB (`db/connection.py`, `db/base.py`) và 7 ORM Models.
   - Tạo và áp dụng Alembic migration ban đầu: `uv run alembic upgrade head`.
   - Viết runner cho 4 services: Ingestion, Analysis (6 patterns), Clustering, Prediction.
   - Triển khai FastAPI routes và kênh SSE.
2. **Giai đoạn Triển khai Frontend (`apps/web`):**
   - Cài đặt thư viện Leaflet, Recharts, Lucide qua `pnpm install`.
   - Dựng giao diện Dark Mode thẩm mỹ cao và bản đồ địa chấn trực quan.
   - Triển khai 6 component cho 6 patterns chuỗi thời gian.
   - Kết nối hook `useSSE` cập nhật dữ liệu thời gian thực.

