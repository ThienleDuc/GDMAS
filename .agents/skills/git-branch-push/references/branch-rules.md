# Hướng Dẫn Quy Tắc Quản Lý & Xuất Bản Nhánh Git (GDMAS Branch Guide)

Tài liệu tham khảo nghiệp vụ phục vụ kỹ năng **`git-branch-push`** trong dự án **Global Disaster Monitoring & Analysis System (GDMAS)**.

---

## 1. Cấu Trúc Đặt Tên Nhánh Chuẩn Hóa

Mọi nhánh trong dự án GDMAS bắt buộc tuân thủ định dạng:

```text
<type>/<scope>-<short-description>
```

### Bảng Phân Loại Tiền Tố (`type`):
| Tiền tố | Ý nghĩa | Nhánh cơ sở (`base`) | Quy tắc bảo vệ |
| :--- | :--- | :--- | :--- |
| **`feature/`** | Phát triển chức năng mới | `develop` | Cấm commit trực tiếp lên main |
| **`bugfix/`** | Sửa lỗi trong giai đoạn phát triển | `develop` | Rebase trước khi merge |
| **`hotfix/`** | Sửa lỗi khẩn cấp trực tiếp từ bản phát hành | `main` | Cần duyệt gấp & merge cả main và develop |
| **`docs/`** | Viết hoặc cập nhật tài liệu kỹ thuật | `develop` / `main` | Không can thiệp mã nguồn |
| **`refactor/`** | Tái cấu trúc, dọn dẹp mã nguồn | `develop` | Tuân thủ Open-Closed Principle |
| **`test/`** | Viết kiểm thử tự động, mock data | `develop` | Đảm bảo CI/CD xanh |
| **`chore/`** | Cấu hình công cụ, dependencies, docker | `develop` | Cập nhật cấu hình môi trường |

### Bảng Phạm Vi Phổ Biến (`scope`):
- `core`: Khung dự án, scaffolding, cấu hình dùng chung.
- `ingestion`: Service nạp dữ liệu địa chấn từ USGS API.
- `analysis`: Module phân tích 6 mẫu hình chuỗi thời gian (Time-Series).
- `clustering`: Giải thuật gom cụm không gian DBSCAN / KMeans.
- `prediction`: Mô hình dự báo rủi ro động đất $t+1$.
- `api`: FastAPI backend, routes, database models, kênh SSE.
- `web`: Frontend React, Dashboard, bản đồ Leaflet, biểu đồ Recharts.
- `db`: Cơ sở dữ liệu PostgreSQL, SQLAlchemy ORM, Alembic migrations.
- `docker`: Cấu hình Dockerfile, docker-compose môi trường chạy.
- `docs`: Tài liệu kỹ thuật, hướng dẫn cài đặt.
- `agents`: Kỹ năng AI, agent automations.
- `scripts`: Bộ kịch bản tự động hóa, kiểm thử nội bộ.

---

## 2. Quy Chuẩn Đồng Bộ Với Remote GitHub

1. **Khởi tạo Upstream Tracking:**
   Khi tạo nhánh mới, luôn thiết lập liên kết với remote branch:
   ```bash
   git push -u origin <branch-name>
   ```

2. **Quy tắc Kiểm tra An toàn (Pre-flight Checks):**
   - Không được để mất dữ liệu unstaged trước khi chuyển hoặc tạo nhánh.
   - Đồng bộ (`pull --rebase`) nhánh cơ sở trước khi rẽ nhánh mới để tránh xung đột lịch sử commit.
   - Nhánh `main` là nhánh được bảo vệ, chỉ nhận mã nguồn qua Pull Request đã qua kiểm duyệt (Reviewer Approval).

3. **Lưu vết Cục bộ (Local Audit Logging):**
   Mọi hành động tạo và xuất bản nhánh cần được lưu biên bản vào `.agents/notes/branches/` để nhóm phát triển dễ dàng theo dõi.

