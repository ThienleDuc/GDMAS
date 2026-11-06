# QUY TẮC BẢO TOÀN MÃ NGUỒN (OPEN-CLOSED PRINCIPLE - OCP)

Tài liệu tham chiếu kỹ thuật cho kỹ năng **`source-guard`** trong hệ thống **GDMAS**.

---

## 1. Tuyên Ngôn Cốt Lõi

> **"Không sửa mã nguồn hiện tại – Chỉ bổ sung thêm mới"**  
> *(Closed for Modification, Open for Extension)*

Mọi tính năng mới, thuật toán phân tích, endpoint API hay component giao diện phải được phát triển dưới dạng **mở rộng độc lập**, không được làm thay đổi hoặc phá vỡ các khối mã nguồn đã chạy ổn định.

---

## 2. Bảng Danh Mục Hành Vi Bị Cấm & Giải Pháp Thay Thế

| Hành vi bị CẤM (Violations) | Rủi ro kỹ thuật | Giải pháp THAY THẾ (Extension) |
| :--- | :--- | :--- |
| **Xóa tệp mã nguồn (`git rm` / `D`)** | Gây lỗi `ImportError`, phá vỡ build | Giữ nguyên tệp cũ, đánh dấu `@deprecated` nếu không còn dùng |
| **Sửa đổi `main.py` để nhúng worker** | Làm chết API khi worker gặp sự cố, vi phạm kiến trúc 7 terminals | Tạo file `runner.py` riêng trong thư mục service để chạy ở terminal độc lập |
| **Sửa đổi signature hàm/phương thức cũ** | Gây lỗi runtime cho các module đang gọi hàm | Tạo hàm mới (ví dụ `fetch_events_v2()`) hoặc dùng default parameters |
| **Sửa trực tiếp bảng CSDL trong PostgreSQL** | Mất đồng bộ schema, xung đột giữa các service | Tạo migration mới qua Alembic (`uv run alembic revision --autogenerate`) |
| **Sửa đổi component giao diện đang chạy** | Gây hồi quy giao diện, lỗi render | Tạo component mới trong thư mục component và import có điều kiện |
| **Xóa hoặc sửa test cases cũ đang pass** | Che giấu lỗi hồi quy (regression bugs) | Viết thêm test cases mới trong file test độc lập |

---

## 3. Các Mô Hình Mở Rộng Chuẩn Trong GDMAS

### 3.1. Bổ sung Service Runner (Đáp ứng 7 Terminals)
- **Vị trí:** `apps/api/src/gdmas/services/<service_name>/runner.py`
- **Cách chạy:** `uv run python -m gdmas.services.<service_name>.runner`
- **Không can thiệp:** Tuyệt đối không can thiệp vào `apps/api/src/gdmas/main.py`.

### 3.2. Bổ sung REST API Router
- **Vị trí:** `apps/api/src/gdmas/api/routes/<new_resource>.py`
- **Cách tích hợp:** Đăng ký router mới vào API Router trung tâm qua `router.include_router(new_router)` mà không thay đổi logic xử lý của các endpoint sẵn có.

### 3.3. Bổ sung Mô hình Dữ liệu (ORM Models & Schemas)
- **Schema:** Bổ sung class Pydantic mới trong `schemas/`.
- **Model:** Bổ sung SQLAlchemy Model mới trong `models/`.
- **Database:** Tạo file migration mới trong `alembic/versions/`.

### 3.4. Bổ sung Biểu đồ & Frontend Component
- **Vị trí:** `apps/web/src/components/charts/<PatternNameChart>.tsx`
- **Tích hợp:** Sử dụng component này tại Dashboard Page mà không ghi đè lên các biểu đồ khác.

