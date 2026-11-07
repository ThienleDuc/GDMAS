# Sổ Tay Tra Cứu Quy Ước Phân Nhánh (Branch Guide)

Tài liệu tham khảo phục vụ kỹ năng **`propose-branch`** trong dự án **GDMAS**.

---

## 1. Cấu Trúc Định Danh Nhánh

```text
<type>/<scope>-<short-description>
```

- **Quy tắc ký tự:** Toàn bộ chữ thường (lowercase), không dấu tiếng Việt, các từ ngăn cách bằng dấu gạch ngang (`-`).
- **Nguyên tắc ngắn gọn:** Phần `<short-description>` từ 2 đến 4 từ khóa phản ánh chính xác mục tiêu kỹ thuật.

---

## 2. Bảng Phân Loại Tiền Tố (`type`)

| Tiền tố | Ý nghĩa | Nhánh cơ sở mặc định | Ví dụ |
| :--- | :--- | :--- | :--- |
| `feature/` | Tính năng mới, service mới, component mới | `develop` | `feature/ingestion-usgs-worker`<br>`feature/web-earthquake-map` |
| `bugfix/` | Sửa lỗi trong quá trình phát triển | `develop` | `bugfix/api-cors-origin`<br>`bugfix/db-upsert-idempotency` |
| `hotfix/` | Sửa lỗi khẩn cấp trực tiếp trên môi trường ổn định | `main` | `hotfix/postgres-port-binding` |
| `docs/` | Bổ sung, chỉnh sửa tài liệu kỹ thuật | `develop` / `main` | `docs/setup-hardware-requirements`<br>`docs/api-specifications` |
| `refactor/`| Tinh chỉnh cấu trúc code, tối ưu hóa | `develop` | `refactor/clustering-dbscan-service` |
| `test/` | Bổ sung unit test, integration test, mock data | `develop` | `test/api-usgs-ingestion-mock` |
| `chore/` | Cấu hình công cụ, phụ thuộc, scripts | `develop` | `chore/update-pnpm-dependencies` |

---

## 3. Bảng Phạm Vi Phổ Biến (`scope`)

- `api`: FastAPI backend, routes, controllers, middleware
- `web`: Frontend React, Vite, Leaflet, Recharts, Tailwind CSS
- `ingestion`: Tiến trình crawl và nạp dữ liệu địa chấn từ USGS
- `analysis`: 6 Patterns phân tích chuỗi thời gian địa chấn
- `clustering`: Giải thuật gom cụm không gian DBSCAN / KMeans
- `prediction`: Mô hình dự báo rủi ro thời gian thực
- `db`: PostgreSQL, SQLAlchemy models, Alembic migrations
- `docker`: Dockerfile, docker-compose, containerization
- `docs`: Tài liệu kỹ thuật, hướng dẫn cài đặt, kiến trúc
- `setup`: Cấu hình môi trường phát triển cục bộ
- `agents`: Kỹ năng AI, agent automations, quy tắc pair programming
- `scripts`: Bộ kịch bản tự động hóa, kiểm thử nội bộ

