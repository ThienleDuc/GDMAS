# Hướng Dẫn Docker Compose Cho Dự Án GDMAS

Docker Compose là công cụ định nghĩa và chạy các ứng dụng Docker đa container (Multi-Container). Trong dự án GDMAS, Docker Compose được sử dụng để điều phối các dịch vụ: Backend API (`gdmas-api`), Frontend Web (`gdmas-web`), Cơ sở dữ liệu (`postgres`), và Luồng tự động hóa (`n8n`).

> **Lưu ý cú pháp:** Sử dụng cú pháp Compose V2 hiện đại: `docker compose` (dấu cách), thay vì lệnh cũ `docker-compose` (dấu gạch nối).

---

## Mục lục
1. [Khởi động & Dừng hệ thống](#1-khởi-động--dừng-hệ-thống)
2. [Quản lý & Giám sát dịch vụ](#2-quản-lý--giám-sát-dịch-vụ)
3. [Thực thi lệnh & Debug trong Service](#3-thực-thi-lệnh--debug-trong-service)
4. [Build & Cập nhật Image](#4-build--cập-nhật-image)
5. [Cấu hình & Quản lý môi trường (.env, override)](#5-cấu-hình--quản-lý-môi-trường-env-override)
6. [Bảng so sánh lệnh nhanh](#6-bảng-so-sánh-lệnh-nhanh)

---

## 1. Khởi động & Dừng hệ thống

### Khởi động dịch vụ (`docker compose up`)
```bash
# Khởi động toàn bộ các dịch vụ ở chế độ chạy nền (detached)
docker compose up -d

# Khởi động và ép build lại image trước khi chạy
docker compose up -d --build

# Buộc tạo lại container (ngay cả khi cấu hình và image không đổi)
docker compose up -d --force-recreate

# Chỉ khởi động một hoặc một vài dịch vụ cụ thể (và các dependencies liên quan)
docker compose up -d postgres
docker compose up -d api web

# Khởi động không kèm dependencies phụ thuộc
docker compose up -d --no-deps api
```

### Dừng và hạ hệ thống (`docker compose down`)
```bash
# Dừng và xóa containers, networks do Compose tạo ra
docker compose down

# Dừng, xóa containers và XÓA LUÔN TẤT CẢ VOLUMES (dữ liệu DB sẽ bị xóa!)
docker compose down -v

# Dọn dẹp cả những container không còn được khai báo trong file compose
docker compose down --remove-orphans

# Kết hợp: hạ sạch sẽ môi trường phát triển để chuẩn bị reset
docker compose down -v --remove-orphans
```

### Tạm dừng / Tiếp tục (`stop`, `start`, `restart`)
```bash
# Tạm dừng container mà không xóa container hay network
docker compose stop

# Khởi động lại các container đã bị stop
docker compose start

# Khởi động lại một dịch vụ cụ thể (hữu ích khi reload config)
docker compose restart api
```

---

## 2. Quản lý & Giám sát dịch vụ

### Kiểm tra trạng thái (`docker compose ps`)
```bash
# Xem danh sách các container của dự án, cổng kết nối và trạng thái
docker compose ps

# Xem bao gồm cả các container đã dừng
docker compose ps -a

# Chỉ hiển thị danh sách service names
docker compose ps --services
```

### Xem log dịch vụ (`docker compose logs`)
```bash
# Xem toàn bộ logs của tất cả services
docker compose logs

# Theo dõi logs trực tiếp theo thời gian thực (follow)
docker compose logs -f

# Chỉ theo dõi logs của một dịch vụ cụ thể kèm timestamp
docker compose logs -f -t api

# Xem 100 dòng log gần nhất của dịch vụ web và postgres
docker compose logs --tail=100 -f web postgres
```

### Giám sát tiến trình và tài nguyên
```bash
# Liệt kê các tiến trình đang chạy bên trong các container
docker compose top

# Liệt kê tiến trình của riêng một service
docker compose top api
```

---

## 3. Thực thi lệnh & Debug trong Service

### Chạy lệnh trong container đang hoạt động (`docker compose exec`)
```bash
# Mở shell tương tác trong container backend api
docker compose exec api bash

# Mở sh tương tác trong container frontend web
docker compose exec web sh

# Truy cập dòng lệnh PostgreSQL
docker compose exec postgres psql -U postgres -d gdmas_db

# Chạy test suite backend
docker compose exec api pytest

# Chạy migration cơ sở dữ liệu (Alembic)
docker compose exec api alembic upgrade head
```

### Chạy tác vụ một lần (One-off Task) (`docker compose run`)
`docker compose run` sẽ tạo một container mới tạm thời dựa trên cấu hình của service để thực thi lệnh.
```bash
# Chạy script khởi tạo dữ liệu một lần và tự xóa container khi xong (--rm)
docker compose run --rm api python scripts/seed_data.py

# Cài đặt dependency npm mới cho frontend
docker compose run --rm web npm install axios
```

---

## 4. Build & Cập nhật Image

```bash
# Build image cho tất cả các service được định nghĩa có directive `build`
docker compose build

# Build không dùng Docker cache
docker compose build --no-cache

# Chỉ build lại một service cụ thể
docker compose build api

# Kéo image mới nhất từ Docker Registry cho các service dùng `image:`
docker compose pull
```

---

## 5. Cấu hình & Quản lý môi trường (.env, override)

### Kiểm tra và Validate cấu hình Compose (`docker compose config`)
Lệnh này parse các tệp YAML, nạp biến từ `.env`, kiểm tra lỗi cú pháp và in ra cấu hình hợp nhất hoàn chỉnh:
```bash
# Kiểm tra cấu hình và xem output sau khi resolve biến
docker compose config

# Chỉ kiểm tra cú pháp, không in ra toàn bộ nội dung
docker compose config --quiet

# Xem danh sách các services được định nghĩa
docker compose config --services

# Xem danh sách các volumes được định nghĩa
docker compose config --volumes
```

### Sử dụng nhiều file Compose & Overrides
Mặc định Docker Compose sẽ tự động đọc cả `docker-compose.yml` và `docker-compose.override.yml`. Nếu cần chỉ định môi trường riêng:
```bash
# Chạy với file cấu hình Production cụ thể
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Chỉ định file .env khác
docker compose --env-file .env.staging up -d
```

### Quản lý theo Profiles
Nếu bạn định nghĩa các profile trong `docker-compose.yml` (ví dụ `tools`, `monitoring`):
```bash
# Khởi động dịch vụ thuộc profile cụ thể
docker compose --profile tools up -d
```

---

## 6. Bảng so sánh lệnh nhanh

| Thao tác | Docker CLI thuần | Docker Compose |
| :--- | :--- | :--- |
| **Khởi động** | `docker run -d ...` | `docker compose up -d` |
| **Dừng & dọn dẹp**| `docker stop && docker rm` | `docker compose down` |
| **Danh sách tiến trình** | `docker ps` | `docker compose ps` |
| **Xem log** | `docker logs -f <id>` | `docker compose logs -f <service>` |
| **Vào shell container** | `docker exec -it <id> bash` | `docker compose exec <service> bash` |
| **Build image** | `docker build -t <tag> .` | `docker compose build` |
| **Khởi động lại** | `docker restart <id>` | `docker compose restart <service>` |

