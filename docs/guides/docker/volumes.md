# Hướng Dẫn Quản Lý Docker Volumes & Dữ Liệu Bền Vững (Persistence)

Trong Docker, container được thiết kế theo nguyên lý phi trạng thái (stateless/ephemeral) – khi xóa container, toàn bộ dữ liệu ghi bên trong nó sẽ mất. Để lưu trữ dữ liệu bền vững (như database PostgreSQL, file upload, workflow n8n), chúng ta sử dụng **Docker Volumes** và **Bind Mounts**.

---

## Mục lục
1. [Phân biệt Docker Volume và Bind Mount](#1-phân-biệt-docker-volume-và-bind-mount)
2. [Các câu lệnh quản lý Volume CLI](#2-các-câu-lệnh-quản-lý-volume-cli)
3. [Khai báo Volume trong Docker Compose](#3-khai-báo-volume-trong-docker-compose)
4. [Quy trình Sao lưu (Backup) & Khôi phục (Restore)](#4-quy-trình-sao-lưu-backup--khôi-phục-restore)
5. [Xử lý vấn đề phân quyền (Permissions & Windows/WSL2)](#5-xử-lý-vấn-đề-phân-quyền-permissions--windowswsl2)

---

## 1. Phân biệt Docker Volume và Bind Mount

| Đặc tính | Docker Named Volume | Bind Mount |
| :--- | :--- | :--- |
| **Vị trí lưu trữ** | Do Docker quản lý (trên Linux/WSL: `/var/lib/docker/volumes/...`) | Bất kỳ thư mục nào trên máy Host (ví dụ: `./apps/api`) |
| **Mục đích chính** | Dữ liệu cơ sở dữ liệu (`postgres`, `redis`), workflow `n8n` | Hot-reloading code trong lúc phát triển, file config tĩnh |
| **Hiệu năng I/O** | Tối ưu hóa, tốc độ đọc/ghi cao | Phụ thuộc filesystem máy host (chậm hơn trên Windows nếu mount qua NTFS) |
| **Quản lý bằng CLI**| Hỗ trợ đầy đủ: `docker volume ...` | Quản lý theo đường dẫn file hệ điều hành |

---

## 2. Các câu lệnh quản lý Volume CLI

### Liệt kê Volume (`docker volume ls`)
```bash
# Xem tất cả các volume hiện có trên máy
docker volume ls

# Lọc các volume mồ côi (không được gắn vào bất kỳ container nào)
docker volume ls -f dangling=true

# Tùy biến định dạng hiển thị
docker volume ls --format "table {{.Name}}\t{{.Driver}}\t{{.Scope}}"
```

### Tạo & Kiểm tra Volume (`create`, `inspect`)
```bash
# Tạo một volume mới có tên cụ thể
docker volume create gdmas_postgres_data

# Xem chi tiết cấu hình và đường dẫn vật lý (Mountpoint) của volume
docker volume inspect gdmas_postgres_data
```

### Xóa Volume (`rm`, `prune`)
> **CẢNH BÁO:** Dữ liệu trong volume khi đã xóa sẽ KHÔNG THỂ khôi phục nếu chưa tạo bản backup!
```bash
# Xóa một volume cụ thể (volume phải không được container nào sử dụng)
docker volume rm gdmas_postgres_data

# Xóa tất cả các volume mồ côi (không gắn với container nào)
docker volume prune

# Xóa toàn bộ volume mồ côi không cần xác nhận hỏi lại
docker volume prune -f
```

---

## 3. Khai báo Volume trong Docker Compose

Dưới đây là ví dụ cấu hình chuẩn cho dự án GDMAS trong file `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: gdmas-postgres
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      POSTGRES_DB: ${POSTGRES_DB:-gdmas_db}
    volumes:
      # Named volume dùng lưu trữ database bền vững
      - pgdata:/var/lib/postgresql/data
      # Bind mount dùng nạp script khởi tạo database lúc đầu
      - ./infra/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    ports:
      - "5432:5432"

  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    volumes:
      # Bind mount mã nguồn để hỗ trợ live-reload khi code
      - ./apps/api:/app
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/gdmas_db
    ports:
      - "8000:8000"

# Khai báo các Named Volumes ở cấp root
volumes:
  pgdata:
    name: gdmas_pgdata
  n8n_data:
    name: gdmas_n8n_data
```

---

## 4. Quy trình Sao lưu (Backup) & Khôi phục (Restore)

Vì dữ liệu trong Named Volume nằm trong vùng do Docker quản lý, ta sử dụng một container phụ trợ nhỏ (`alpine`) để đóng gói dữ liệu thành tệp nén `.tar.gz`.

### Bước 1: Sao lưu Volume ra file nén (.tar.gz)
```bash
# Tạo thư mục lưu backup trên máy host
mkdir -p ./backups

# Chạy container tạm thời mount volume và nén dữ liệu ra thư mục máy host
docker run --rm \
  -v gdmas_pgdata:/volume-data \
  -v $(pwd)/backups:/backup-target \
  alpine tar -czvf /backup-target/gdmas_pgdata_backup.tar.gz -C /volume-data .
```

### Bước 2: Khôi phục dữ liệu từ file nén vào Volume mới
```bash
# Tạo volume mới để nhận dữ liệu
docker volume create gdmas_pgdata_restored

# Chạy container tạm để giải nén file backup vào volume
docker run --rm \
  -v gdmas_pgdata_restored:/volume-data \
  -v $(pwd)/backups:/backup-source \
  alpine tar -xzvf /backup-source/gdmas_pgdata_backup.tar.gz -C /volume-data
```

### Sao chép dữ liệu giữa 2 Volume trực tiếp
```bash
# Copy toàn bộ dữ liệu từ volume-old sang volume-new
docker run --rm \
  -v volume-old:/from \
  -v volume-new:/to \
  alpine cp -av /from/. /to/
```

---

## 5. Xử lý vấn đề phân quyền (Permissions & Windows/WSL2)

### Vấn đề Permission Denied trên Linux
Khi container chạy bằng user không phải `root` (ví dụ `node` hoặc `appuser`), container có thể không có quyền ghi vào thư mục volume được mount từ host.
- **Giải pháp:** Cấp quyền cho thư mục host trước khi mount:
  ```bash
  # Cấp quyền cho thư mục dữ liệu
  chmod -R 775 ./data
  # Hoặc đổi quyền sở hữu sang UID tương ứng trong container
  sudo chown -R 1000:1000 ./data
  ```

### Vấn đề hiệu năng Bind Mount trên Windows (Docker Desktop)
- Khi mount thư mục từ ổ đĩa Windows (ví dụ `D:\KHDLKPDL\...`) vào container, tốc độ I/O có thể chậm do qua tầng dịch NTFS sang Linux.
- **Khuyến nghị cho Windows:** 
  - Đặt dự án bên trong hệ thống tệp của WSL 2 (`\\wsl$\Ubuntu\home\...`) thay vì ổ đĩa Windows (`C:\`, `D:\`) khi cần tốc độ build và hot-reload nhanh nhất.
  - Sử dụng cờ `:cached` hoặc `:delegated` trong đường dẫn bind mount nếu có thể.

