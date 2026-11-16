# Hướng Dẫn Khắc Phục Sự Cố Docker Thường Gặp (Docker Troubleshooting)

Tài liệu này tổng hợp các lỗi phổ biến nhất khi làm việc với Docker/Docker Compose trong dự án GDMAS và quy trình từng bước để chẩn đoán, xử lý nhanh chóng.

---

## Mục lục
1. [Lỗi xung đột cổng (Port already allocated)](#1-lỗi-xung-đột-cổng-port-already-allocated)
2. [Container crash liên tục hoặc dừng đột ngột (Exit Codes)](#2-container-crash-liên-tục-hoặc-dừng-đột-ngột-exit-codes)
3. [Lỗi hết dung lượng ổ cứng (No space left on device)](#3-lỗi-hết-dung-lượng-ổ-cứng-no-space-left-on-device)
4. [Lỗi kết nối mạng giữa các Container (Network & DNS)](#4-lỗi-kết-nối-mạng-giữa-các-container-network--dns)
5. [Lỗi không kết nối được Docker Daemon](#5-lỗi-không-kết-nối-được-docker-daemon)
6. [Checklist lệnh chẩn đoán nhanh](#6-checklist-lệnh-chẩn-đoán-nhanh)

---

## 1. Lỗi xung đột cổng (Port already allocated)

### Triệu chứng:
```text
Error response from daemon: driver failed programming external connectivity on endpoint gdmas-postgres:
Bind for 0.0.0.0:5432 failed: port is already allocated
```

### Nguyên nhân:
Cổng (ví dụ `5432` của Postgres hoặc `8000` của FastAPI, `3000` của Web) đang bị chiếm dụng bởi một tiến trình chạy ngầm trên máy host hoặc một container Docker khác.

### Cách xử lý:
**Bước 1: Tìm tiến trình đang chiếm cổng**
- **Trên Windows (PowerShell):**
  ```powershell
  # Tìm PID của tiến trình chiếm cổng 5432
  netstat -ano | findstr :5432

  # Xem thông tin tiến trình từ PID tìm được (ví dụ PID 12345)
  Get-Process -Id 12345
  ```
- **Trên Linux / WSL:**
  ```bash
  sudo lsof -i :5432
  # hoặc
  sudo ss -tulpn | grep :5432
  ```

**Bước 2: Giải phóng cổng hoặc đổi cổng map**
- Tắt tiến trình chiếm cổng:
  ```powershell
  # Windows
  Stop-Process -Id 12345 -Force
  ```
- Hoặc thay đổi cổng máy host trong file `docker-compose.yml` hoặc `.env`:
  ```yaml
  ports:
    - "5433:5432" # Map cổng 5433 máy host vào 5432 của container
  ```

---

## 2. Container crash liên tục hoặc dừng đột ngột (Exit Codes)

### Triệu chứng:
Container ở trạng thái `Exited (...)` hoặc liên tục `Restarting (1)` khi gõ `docker ps`.

### Bảng tra cứu Exit Code phổ biến:
| Exit Code | Ý nghĩa | Nguyên nhân thường gặp & Hướng khắc phục |
| :--- | :--- | :--- |
| **0** | Success / Normal stop | Tiến trình chính đã chạy xong và thoát bình thường (ví dụ script chạy xong). Nếu muốn container chạy lâu dài, cần tiến trình foreground (như `uvicorn`, `nginx`). |
| **1** | Application Error | Ứng dụng ném Exception (lỗi cú pháp code, thiếu file `.env`, sai config kết nối DB). |
| **127** | Command Not Found | Lệnh CMD hoặc ENTRYPOINT trong Dockerfile không tồn tại hoặc sai đường dẫn binary. |
| **137** | OOM (Out Of Memory) / SIGKILL | Container bị hệ điều hành tiêu diệt vì vượt quá giới hạn RAM cho phép hoặc máy hết RAM. |
| **139** | SIGSEGV (Segmentation Fault) | Lỗi bộ nhớ tầng C/C++ (thường gặp khi build thư viện native biên dịch sai kiến trúc). |
| **143** | SIGTERM | Container được yêu cầu dừng bởi người dùng hoặc hệ thống (`docker stop`). |

### Cách chẩn đoán:
```bash
# Xem log của container ngay cả khi nó đã dừng
docker logs --tail 100 <container_id_hoặc_name>

# Xem trạng thái và Exit Code chính xác
docker inspect <container_name> --format='ExitCode: {{.State.ExitCode}} | Error: {{.State.Error}}'
```

### Kỹ thuật giữ container sống để vào debug:
Nếu container chết ngay khi bật khiến không thể `exec` vào xem:
```bash
# Ghi đè Entrypoint tạm thời bằng lệnh giữ tiến trình
docker run --rm -it --entrypoint sh gdmas-api:latest
# hoặc dùng sleep infinity
docker run --rm -it gdmas-api:latest sleep infinity
```

---

## 3. Lỗi hết dung lượng ổ cứng (No space left on device)

### Triệu chứng:
```text
failed to register layer: write ...: no space left on device
```

### Nguyên nhân:
Docker lưu trữ nhiều lớp layer build cache, dangling images, và log container lâu ngày không dọn dẹp.

### Cách xử lý:
**Bước 1: Kiểm tra dung lượng Docker đang chiếm**
```bash
docker system df
```

**Bước 2: Dọn dẹp cache và tài nguyên không dùng**
```bash
# Dọn dẹp container đã dừng và dangling images (an toàn)
docker system prune

# Dọn dẹp triệt để bao gồm cả build cache (khuyên dùng khi bị đầy ổ)
docker builder prune -a -f

# Xóa toàn bộ image không gắn vào container nào
docker image prune -a -f
```

> **Mẹo cho người dùng Windows / WSL2:** 
> File đĩa ảo `ext4.vhdx` của WSL2 thường không tự động thu nhỏ sau khi xóa file. Bạn có thể nén lại bằng lệnh `optimize-vhd` trong PowerShell (quyền Admin) hoặc `wsl --shutdown` sau đó chạy `diskpart`.

---

## 4. Lỗi kết nối mạng giữa các Container (Network & DNS)

### Triệu chứng:
```text
sqlalchemy.exc.OperationalError: could not connect to server: Connection refused
# hoặc
FetchError: request to http://localhost:8000/api failed
```

### Nguyên nhân:
1. **Sử dụng sai Hostname:** Trong mạng Docker, các container liên lạc với nhau qua **Service Name** (ví dụ `postgres`, `api`), **KHÔNG DÙNG** `localhost` hay `127.0.0.1`.
2. Hai container không nằm chung một Docker Network.
3. Service nhận kết nối chưa khởi động xong (race condition lúc boot).

### Cách xử lý:
- Trong code backend hoặc biến môi trường `DATABASE_URL`:
  ```bash
  # SAI:
  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gdmas_db

  # ĐÚNG:
  DATABASE_URL=postgresql://postgres:postgres@postgres:5432/gdmas_db
  ```
- Kiểm tra tính thông suốt giữa 2 service:
  ```bash
  # Đứng từ container api thử kết nối tới postgres
  docker compose exec api nc -zv postgres 5432
  # hoặc dùng ping
  docker compose exec api ping -c 3 postgres
  ```
- Đảm bảo cơ chế chờ phụ thuộc (Healthcheck) trong `docker-compose.yml`:
  ```yaml
  depends_on:
    postgres:
      condition: service_healthy
  ```

---

## 5. Lỗi không kết nối được Docker Daemon

### Triệu chứng:
```text
Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?
# hoặc
error during connect: This error may indicate that the docker daemon is not running.
```

### Cách xử lý:
- **Trên Windows:** 
  1. Kiểm tra ứng dụng Docker Desktop đã được mở chưa.
  2. Kiểm tra biểu tượng Docker dưới thanh Taskbar đã hiển thị "Docker Desktop is running" (màu xanh lá) hay chưa.
  3. Mở **Settings > Resources > WSL Integration** và tích chọn distro WSL bạn đang dùng.
- **Trên Linux:**
  ```bash
  # Khởi động lại dịch vụ Docker
  sudo systemctl restart docker

  # Thêm tài khoản hiện tại vào nhóm docker để không cần sudo
  sudo usermod -aG docker $USER
  # Áp dụng thay đổi nhóm
  newgrp docker
  ```

---

## 6. Checklist lệnh chẩn đoán nhanh

Khi gặp sự cố Docker trong dự án, chạy tuần tự các lệnh sau để khoanh vùng:

```bash
# 1. Kiểm tra trạng thái toàn bộ containers
docker compose ps -a

# 2. Xem logs gần nhất của service gặp sự cố
docker compose logs --tail=50 -f <service_name>

# 3. Kiểm tra xem port có đang lắng nghe không
docker port <container_name>

# 4. Kiểm tra mạng và IP của container
docker inspect <container_name> | grep -i ipaddress

# 5. Kiểm tra mức tải tài nguyên (CPU, RAM)
docker stats --no-stream
```
