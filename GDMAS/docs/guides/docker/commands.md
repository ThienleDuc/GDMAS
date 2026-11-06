# Hướng Dẫn Các Lệnh Docker CLI Phổ Biến

Tài liệu này tổng hợp các câu lệnh Docker phổ biến và thiết yếu nhất trong quá trình phát triển dự án GDMAS (Global Disaster Monitoring and Analysis System), từ quản lý container, image, network đến dọn dẹp hệ thống.

---

## Mục lục
1. [Quản lý Container](#1-quản-lý-container)
2. [Tương tác & Giám sát Container](#2-tương-tác--giám-sát-container)
3. [Quản lý Docker Image](#3-quản-lý-docker-image)
4. [Quản lý Docker Network](#4-quản-lý-docker-network)
5. [Dọn dẹp Tài nguyên (System Cleanup)](#5-dọn-dẹp-tài-nguyên-system-cleanup)
6. [Bảng cờ lệnh (Flags) phổ biến](#6-bảng-cờ-lệnh-flags-phổ-biến)

---

## 1. Quản lý Container

Container là môi trường thực thi độc lập đóng gói mã nguồn và tất cả dependencies.

### Khởi tạo và chạy container (`docker run`)
```bash
# Chạy container ở chế độ nền (detached) và map port (máy host:container)
docker run -d -p 8000:8000 --name gdmas-api gdmas-api:latest

# Chạy container và tự động xóa sau khi dừng (--rm)
docker run --rm -it python:3.11-slim bash

# Chạy container với biến môi trường và volume mount
docker run -d \
  --name gdmas-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=gdmas_db \
  -p 5432:5432 \
  -v pgdata:/var/lib/postgresql/data \
  postgres:16-alpine
```

### Xem danh sách container (`docker ps`)
```bash
# Liệt kê các container đang chạy
docker ps

# Liệt kê tất cả container (kể cả container đã dừng)
docker ps -a

# Chỉ hiển thị danh sách Container ID
docker ps -q

# Lọc container theo tên hoặc trạng thái
docker ps --filter "name=gdmas"
docker ps --filter "status=exited"

# Tùy biến định dạng hiển thị
docker ps --format "table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Điều khiển vòng đời container
```bash
# Dừng container (gửi tín hiệu SIGTERM, sau 10s là SIGKILL)
docker stop <container_id_hoặc_name>

# Buộc dừng ngay lập tức (gửi SIGKILL)
docker kill <container_id_hoặc_name>

# Khởi động lại container đã dừng
docker start <container_id_hoặc_name>

# Restart container
docker restart <container_id_hoặc_name>

# Tạm dừng (freeze) và tiếp tục container
docker pause <container_name>
docker unpause <container_name>
```

### Xóa container (`docker rm`)
```bash
# Xóa một container đã dừng
docker rm <container_name>

# Buộc xóa container đang chạy (-f / --force)
docker rm -f <container_name>

# Xóa tất cả các container đã thoát (exited)
docker container prune
```

---

## 2. Tương tác & Giám sát Container

### Thực thi lệnh bên trong container (`docker exec`)
```bash
# Mở terminal tương tác (bash/sh) bên trong container đang chạy
docker exec -it gdmas-api bash
docker exec -it gdmas-web sh

# Chạy trực tiếp một lệnh bên trong container mà không cần mở shell
docker exec gdmas-api python -m pytest
docker exec gdmas-postgres psql -U postgres -d gdmas_db -c "\dt"
```

### Xem log container (`docker logs`)
```bash
# Xem toàn bộ log hiện tại
docker logs gdmas-api

# Xem log theo thời gian thực (follow)
docker logs -f gdmas-api

# Xem 100 dòng log gần nhất kèm timestamp
docker logs -f --tail 100 -t gdmas-api

# Xem log kể từ thời điểm cụ thể (ví dụ: 10 phút trước)
docker logs --since 10m gdmas-api
```

### Thống kê tài nguyên & Kiểm tra thông tin
```bash
# Giám sát mức sử dụng CPU, RAM, Network I/O thời gian thực của container
docker stats

# Xem chi tiết cấu hình, IP, mount, port bindings dạng JSON
docker inspect gdmas-api

# Lấy riêng địa chỉ IP của container
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' gdmas-api

# Xem các tiến trình đang chạy bên trong container
docker top gdmas-api
```

### Sao chép tệp giữa Host và Container (`docker cp`)
```bash
# Sao chép tệp từ máy Host vào Container
docker cp ./config.yaml gdmas-api:/app/config.yaml

# Sao chép tệp/thư mục từ Container ra máy Host
docker cp gdmas-api:/app/logs/error.log ./logs/error.log
```

---

## 3. Quản lý Docker Image

Image là bản thiết kế (blueprint) chỉ đọc dùng để khởi tạo container.

### Xây dựng Image (`docker build`)
```bash
# Build image từ Dockerfile trong thư mục hiện tại với tag chỉ định
docker build -t gdmas-api:v0.1.0 .

# Build image chỉ định rõ đường dẫn file Dockerfile
docker build -f ./apps/api/Dockerfile -t gdmas-api:latest ./apps/api

# Build không sử dụng cache (khi cần tải lại dependencies mới nhất)
docker build --no-cache -t gdmas-web:latest ./apps/web

# Truyền build-arg vào Dockerfile
docker build --build-arg ENVIRONMENT=production -t gdmas-api:prod .
```

### Liệt kê & Kiểm tra Image
```bash
# Xem danh sách các image trên máy
docker images

# Lọc image theo tên
docker images "gdmas-*"

# Xem lịch sử các layer tạo nên image
docker history gdmas-api:latest
```

### Đặt tag và Đẩy lên Registry (`docker tag`, `docker push`, `docker pull`)
```bash
# Gán thêm tag mới cho image
docker tag gdmas-api:latest myregistry.azurecr.io/gdmas-api:v1.0.0

# Đăng nhập vào Registry (Docker Hub, GitHub Container Registry, ECR,...)
docker login ghcr.io

# Tải image từ Registry về máy
docker pull postgres:16-alpine

# Đẩy image lên Registry
docker push myregistry.azurecr.io/gdmas-api:v1.0.0
```

### Xóa Image (`docker rmi`)
```bash
# Xóa một image theo tên hoặc ID
docker rmi gdmas-api:v0.1.0

# Xóa image bị ép buộc (kể cả khi có container đang dùng tham chiếu cũ)
docker rmi -f <image_id>

# Xóa tất cả dangling images (những image <none>:<none>)
docker image prune

# Xóa toàn bộ image không được sử dụng bởi bất kỳ container nào
docker image prune -a
```

---

## 4. Quản lý Docker Network

Mạng Docker cho phép các container giao tiếp an toàn với nhau.

```bash
# Liệt kê các network hiện có
docker network ls

# Tạo một bridge network mới
docker network create gdmas-net

# Kết nối container đang chạy vào network
docker network connect gdmas-net gdmas-api

# Ngắt kết nối container khỏi network
docker network disconnect gdmas-net gdmas-api

# Kiểm tra thông tin chi tiết của network (danh sách container và IP kết nối)
docker network inspect gdmas-net

# Xóa một network
docker network rm gdmas-net

# Xóa tất cả các network không được sử dụng
docker network prune
```

---

## 5. Dọn dẹp Tài nguyên (System Cleanup)

Docker tích lũy dữ liệu cache, image cũ và container dừng theo thời gian làm đầy ổ cứng.

```bash
# Xem tổng quan mức chiếm dụng dung lượng đĩa của Docker
docker system df

# Xem chi tiết từng thành phần
docker system df -v

# Dọn dẹp an toàn: container dừng, dangling images, network thừa
docker system prune

# Dọn dẹp triệt để (bao gồm tất cả image không dùng và volumes không gắn)
# CẢNH BÁO: Kiểm tra kỹ volume database trước khi dùng cờ --volumes!
docker system prune -a --volumes -f
```

---

## 6. Bảng cờ lệnh (Flags) phổ biến

| Cờ (Flag) | Tên đầy đủ | Ý nghĩa | Ví dụ |
| :--- | :--- | :--- | :--- |
| `-d` | `--detach` | Chạy container ở chế độ nền (background) | `docker run -d nginx` |
| `-p` | `--publish` | Map cổng `host_port:container_port` | `docker run -p 3000:3000 web` |
| `-v` | `--volume` | Gắn volume hoặc bind-mount thư mục | `docker run -v $(pwd):/app node` |
| `-e` | `--env` | Đặt biến môi trường | `docker run -e ENV=prod api` |
| `--env-file` | - | Đọc danh sách biến môi trường từ tệp | `docker run --env-file .env api` |
| `--name` | - | Đặt tên gợi nhớ cho container | `docker run --name my-db postgres` |
| `--rm` | - | Tự động xóa container khi tiến trình kết thúc | `docker run --rm busybox echo hi` |
| `-it` | `--interactive` + `--tty` | Mở terminal tương tác trực tiếp | `docker run -it ubuntu bash` |
| `--restart` | - | Thiết lập chính sách khởi động lại (`always`, `unless-stopped`, `on-failure`) | `docker run --restart unless-stopped api` |
| `--network` | - | Chỉ định network kết nối | `docker run --network gdmas-net api` |

