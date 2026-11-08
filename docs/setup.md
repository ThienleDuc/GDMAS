# 🚀 Sổ Tay Cấu Hình Môi Trường Cục Bộ & Lệnh Thực Thi (GDMAS Local Setup Guide)

Tài liệu này quy định toàn bộ **yêu cầu về cấu hình máy cục bộ (Local System Requirements)**, các biến môi trường cần thiết, kịch bản cấu hình tự động và **danh mục câu lệnh chạy cấu hình chi tiết từng bước** để sẵn sàng vận hành dự án **GDMAS (Global Disaster Monitoring and Analysis System)** theo mô hình phân tán 7 Terminals.

---

## 📋 Mục lục

1. [Yêu cầu về Cấu hình Máy Cục Bộ (Local System Requirements)](#1-yêu-cầu-về-cấu-hình-máy-cục-bộ-local-system-requirements)
   - [1.1 Cấu hình Phần cứng (Hardware Specifications)](#11-cấu-hình-phần-cứng-hardware-specifications)
   - [1.2 Hệ điều hành & Nền tảng Hỗ trợ](#12-hệ-điều-hành--nền-tảng-hỗ-trợ)
   - [1.3 Bảng Cổng Mạng Cần Giải Phóng (Port Allocation)](#13-bảng-cổng-mạng-cần-giải-phóng-port-allocation)
   - [1.4 Danh mục Phần mềm Cốt lõi & Phiên bản Bắt buộc](#14-danh-mục-phần-mềm-cốt-lõi--phiên-bản-bắt-buộc)
   - [1.5 Cấu hình Biến Môi trường Cục bộ (`.env` Configuration)](#15-cấu-hình-biến-môi-trường-cục-bộ-env-configuration)
2. [Kịch Bản Chạy Cấu Hình Tự Động Trong 1 Lệnh (Automated Scripts)](#2-kịch-bản-chạy-cấu-hình-tự-động-trong-1-lệnh-automated-scripts)
   - [2.1 Kịch bản dành cho Windows (PowerShell)](#21-kịch-bản-dành-cho-windows-powershell)
   - [2.2 Kịch bản dành cho Linux / macOS / Git Bash](#22-kịch-bản-dành-cho-linux--macos--git-bash)
3. [Quy Trình Chạy Lệnh Cấu Hình Thủ Công Từng Bước (Step-by-Step Commands)](#3-quy-trình-chạy-lệnh-cấu-hình-thủ-công-từng-bước-step-by-step-commands)
   - [Bước 1: Kiểm tra phiên bản & Giải phóng cổng kết nối](#bước-1-kiểm-tra-phiên-bản--giải-phóng-cổng-kết-nối)
   - [Bước 2: Khởi tạo các tệp biến môi trường `.env`](#bước-2-khởi-tạo-các-tệp-biến-môi-trường-env)
   - [Bước 3: Cấu hình Backend & Môi trường ảo Python (`apps/api`)](#bước-3-cấu-hình-backend--môi-trường-ảo-python-appsapi)
   - [Bước 4: Cấu hình Frontend Web Client (`apps/web`)](#bước-4-cấu-hình-frontend-web-client-appsweb)
   - [Bước 5: Khởi động Database & Áp dụng Migration Schemas](#bước-5-khởi-động-database--áp-dụng-migration-schemas)
4. [Lệnh Thực Thi 7 Khối Dịch Vụ Độc Lập (7 Terminals Commands)](#4-lệnh-thực-thi-7-khối-dịch-vụ-độc-lập-7-terminals-commands)
5. [Lệnh Kiểm Tra & Xác Nhận Cấu Hình Thành Công (Smoke Test)](#5-lệnh-kiểm-tra--xác-nhận-cấu-hình-thành-công-smoke-test)
6. [Khắc Phục Sự Cố Cấu Hình Thường Gặp (Troubleshooting)](#6-khắc-phục-sự-cố-cấu-hình-thường-gặp-troubleshooting)

---

## 1. Yêu cầu về Cấu hình Máy Cục Bộ (Local System Requirements)

Để vận hành đồng thời **7 terminals độc lập** (bao gồm Docker PostgreSQL, 4 tiến trình nền Python Workers, máy chủ FastAPI và Frontend Vite React), máy tính phát triển cần đáp ứng các tiêu chuẩn sau:

### 1.1 Cấu hình Phần cứng (Hardware Specifications)

| Thông số | Mức Tối thiểu (Minimum) | Mức Khuyến nghị (Recommended) | Ghi chú kỹ thuật |
| :--- | :--- | :--- | :--- |
| **Bộ vi xử lý (CPU)** | 4 Cores (x86_64 hoặc ARM64) | 6 – 8 Cores | Xử lý đa luồng cho 4 workers và máy chủ API đồng thời |
| **Bộ nhớ RAM** | 8 GB RAM | 16 GB RAM trở lên | Chứa Docker PostgreSQL (1GB), Pandas/Statsmodels (2-4GB), Node.js (1GB) |
| **Ổ cứng trống (Disk)** | 10 GB SSD | 20 GB SSD trở lên | Chứa Docker image Postgres, thư viện `.venv`, `node_modules` và volume dữ liệu |
| **Kết nối mạng** | Băng thông Internet ổn định | Băng thông cao | Truy vấn USGS GeoJSON API liên tục mỗi 5 phút; tải packages |

### 1.2 Hệ điều hành & Nền tảng Hỗ trợ

- **Windows:** Windows 10 (bản 2004 trở lên) hoặc Windows 11 64-bit. Khuyến khích kích hoạt **WSL2** (Windows Subsystem for Linux) để tối ưu hiệu năng I/O của Docker.
- **Linux:** Ubuntu 20.04 LTS trở lên, Debian 11+, Fedora 38+, Arch Linux.
- **macOS:** macOS Monterey (12+) trở lên; hỗ trợ tối ưu trên cả chip Apple Silicon (M1/M2/M3) và Intel Core.

### 1.3 Bảng Cổng Mạng Cần Giải Phóng (Port Allocation)

Trước khi cấu hình, đảm bảo 3 cổng mạng sau trên `localhost` không bị ứng dụng khác chiếm dụng:

| Cổng (Port) | Giao thức | Dịch vụ đảm nhiệm | Khối kiến trúc |
| :--- | :--- | :--- | :--- |
| **`5432`** | TCP | PostgreSQL 16 Database Server | **Terminal 1** (`docker compose up postgres`) |
| **`8000`** | TCP / HTTP | FastAPI RESTful API & Kênh SSE | **Terminal 6** (`uvicorn gdmas.main:app`) |
| **`3000`** | TCP / HTTP | Vite React Frontend Web Client | **Terminal 7** (`pnpm dev`) |

> [!WARNING]
> Nếu máy tính đã cài sẵn PostgreSQL cục bộ trên cổng `5432`, dịch vụ Docker sẽ không thể bind port. Hãy dừng service PostgreSQL máy host hoặc đổi port chuyển tiếp sang `5433` (xem chi tiết tại [Mục 6](#6-khắc-phục-sự-cố-cấu-hình-thường-gặp-troubleshooting)).

### 1.4 Danh mục Phần mềm Cốt lõi & Phiên bản Bắt buộc

| Công nghệ | Phiên bản Tối thiểu | Phiên bản Khuyến nghị | Cách kiểm tra trên máy |
| :--- | :--- | :--- | :--- |
| **Git** | $\ge 2.38.0$ | $\ge 2.45+$ | `git --version` |
| **Docker Engine** | $\ge 24.0.0$ | $\ge 26.0+$ | `docker --version` |
| **Docker Compose** | $\ge 2.20.0$ (Compose V2) | $\ge 2.28+$ | `docker compose version` |
| **uv Package Manager** | $\ge 0.4.0$ | $\ge 0.13+$ | `uv --version` |
| **Python Runtime** | $3.11.0$ | $3.12+$ (quản lý bởi uv) | `uv run python --version` |
| **Node.js** | $\ge 18.18.0$ (LTS) | $\ge 20.12+$ / $22+$ | `node -v` |
| **pnpm** | $\ge 8.15.0$ | $\ge 9.0+$ | `pnpm -v` |

### 1.5 Cấu hình Biến Môi trường Cục bộ (`.env` Configuration)

Hệ thống quản lý biến môi trường phân tách thành 2 cấp độ:

#### A. Tệp cấu hình gốc (`.env` tại thư mục gốc dự án)
Dành cho Backend API, Database và 4 Worker Services:

```env
# ==============================================================================
# CẤU HÌNH DATABASE POSTGRESQL 16 (DOCKER)
# ==============================================================================
POSTGRES_USER=gdmas_user
POSTGRES_PASSWORD=gdmas_secure_password_2026
POSTGRES_DB=gdmas_db
DB_HOST=localhost
DB_PORT=5432
DATABASE_URL=postgresql+psycopg://gdmas_user:gdmas_secure_password_2026@localhost:5432/gdmas_db

# ==============================================================================
# CẤU HÌNH MÁY CHỦ DATABASE REST API (FASTAPI)
# ==============================================================================
API_HOST=0.0.0.0
API_PORT=8000
ENVIRONMENT=development
DEBUG=True
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# ==============================================================================
# CẤU HÌNH DỊCH VỤ NẠP DỮ LIỆU ĐỊA CHẤN (USGS INGESTION WORKER)
# ==============================================================================
USGS_API_BASE_URL=https://earthquake.usgs.gov/fdsnws/event/1/query
INGESTION_INTERVAL_SECONDS=300
INGESTION_MIN_MAGNITUDE=2.5
INGESTION_TIMEOUT_SECONDS=30

# ==============================================================================
# CẤU HÌNH DỊCH VỤ PHÂN TÍCH & DỰ BÁO CHUỖI THỜI GIAN
# ==============================================================================
ANALYSIS_INTERVAL_SECONDS=300
CLUSTERING_INTERVAL_SECONDS=86400
PREDICTION_INTERVAL_SECONDS=300
```

#### B. Tệp cấu hình Frontend (`apps/web/.env`)
Dành cho ứng dụng Vite React Client:

```env
# URL kết nối tới máy chủ API
VITE_API_URL=http://localhost:8000/api/v1

# URL kết nối tới kênh Server-Sent Events (SSE) thời gian thực
VITE_SSE_URL=http://localhost:8000/api/v1/stream/earthquakes
```

---

## 2. Kịch Bản Chạy Cấu Hình Tự Động Trong 1 Lệnh (Automated Scripts)

### 2.1 Kịch bản dành cho Windows (PowerShell)

Mở PowerShell tại thư mục dự án `GDMAS` và chạy đoạn script tự động sau để khởi tạo toàn bộ môi trường từ đầu đến cuối:

```powershell
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "     GDMAS AUTOMATED LOCAL SETUP (WINDOWS POWERSHELL)   " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Khởi tạo tệp .env nếu chưa có
if (-not (Test-Path ".env")) {
    Write-Host "[1/5] Đang tạo file .env từ .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
} else {
    Write-Host "[1/5] File .env đã tồn tại." -ForegroundColor Green
}

# 2. Khởi tạo Frontend .env nếu chưa có
if (-not (Test-Path "apps\web\.env")) {
    Write-Host "[2/5] Đang tạo file apps\web\.env..." -ForegroundColor Yellow
    @"
VITE_API_URL=http://localhost:8000/api/v1
VITE_SSE_URL=http://localhost:8000/api/v1/stream/earthquakes
"@ | Out-File -FilePath "apps\web\.env" -Encoding utf8
} else {
    Write-Host "[2/5] File apps\web\.env đã tồn tại." -ForegroundColor Green
}

# 3. Đồng bộ môi trường Backend với uv
Write-Host "[3/5] Đang đồng bộ môi trường Python Backend bằng uv..." -ForegroundColor Yellow
Set-Location apps\api
uv venv
uv sync --all-extras --dev
uv pip install -e .
Set-Location ..\..

# 4. Cài đặt thư viện Frontend với pnpm
Write-Host "[4/5] Đang cài đặt thư viện Frontend bằng pnpm..." -ForegroundColor Yellow
Set-Location apps\web
pnpm install
Set-Location ..\..

# 5. Khởi động Docker Database và chạy Migration
Write-Host "[5/5] Đang khởi chạy PostgreSQL Docker Container..." -ForegroundColor Yellow
docker compose up -d postgres
Start-Sleep -Seconds 5

Write-Host "Đang áp dụng Database Migrations (Alembic)..." -ForegroundColor Yellow
Set-Location apps\api
uv run alembic upgrade head
Set-Location ..\..

Write-Host "========================================================" -ForegroundColor Green
Write-Host "  ✅ HOÀN TẤT THIẾT LẬP! HỆ THỐNG ĐÃ SẴN SÀNG KHỞI CHẠY " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
```

### 2.2 Kịch bản dành cho Linux / macOS / Git Bash

Lưu kịch bản hoặc chạy trực tiếp trong terminal Bash:

```bash
#!/usr/bin/env bash
set -e

echo "========================================================"
echo "      GDMAS AUTOMATED LOCAL SETUP (BASH / LINUX / MAC)  "
echo "========================================================"

# 1. Khởi tạo .env
echo "--> [1/5] Thiết lập tệp cấu hình biến môi trường..."
[ ! -f .env ] && cp .env.example .env
[ ! -f apps/web/.env ] && echo "VITE_API_URL=http://localhost:8000/api/v1\nVITE_SSE_URL=http://localhost:8000/api/v1/stream/earthquakes" > apps/web/.env

# 2. Cấu hình Backend Python
echo "--> [2/5] Cấu hình môi trường ảo Backend (uv)..."
cd apps/api
uv venv
uv sync --all-extras --dev
uv pip install -e .
cd ../..

# 3. Cấu hình Frontend Web
echo "--> [3/5] Cài đặt dependencies Frontend (pnpm)..."
cd apps/web
pnpm install
cd ../..

# 4. Khởi động Docker Database
echo "--> [4/5] Khởi động PostgreSQL 16..."
docker compose up -d postgres
sleep 4

# 5. Chạy Alembic Migrations
echo "--> [5/5] Áp dụng Database Schema Migrations..."
cd apps/api
uv run alembic upgrade head
cd ../..

echo "========================================================"
echo "  ✅ THIẾT LẬP MÔI TRƯỜNG THÀNH CÔNG! SẴN SÀNG CHẠY     "
echo "========================================================"
```

---

## 3. Quy Trình Chạy Lệnh Cấu Hình Thủ Công Từng Bước (Step-by-Step Commands)

Nếu muốn chủ động kiểm soát từng cấu phần, hãy thực hiện lần lượt các bước dưới đây:

### Bước 1: Kiểm tra phiên bản & Giải phóng cổng kết nối

1. **Kiểm tra công cụ bắt buộc:**
   ```bash
   git --version
   docker --version
   docker compose version
   uv --version
   node -v
   pnpm -v
   ```
2. **Kiểm tra giải phóng cổng (Windows PowerShell):**
   ```powershell
   Get-NetTCPConnection -LocalPort 5432, 8000, 3000 -ErrorAction SilentlyContinue | Select-Object LocalPort, State, OwningProcess
   ```
   Nếu cổng `5432` đang bị chiếm bởi PostgreSQL cục bộ, chạy lệnh dừng service:
   ```powershell
   Stop-Service postgresql* -PassThru
   ```

### Bước 2: Khởi tạo các tệp biến môi trường `.env`

Tạo tệp `.env` tại thư mục gốc và `apps/web/.env`:

```bash
# Windows PowerShell:
Copy-Item .env.example .env

# Linux / macOS / Git Bash:
cp .env.example .env
```

Mở tệp `.env` vừa tạo và kiểm tra chuỗi kết nối:
```text
DATABASE_URL=postgresql+psycopg://gdmas_user:gdmas_secure_password_2026@localhost:5432/gdmas_db
```

### Bước 3: Cấu hình Backend & Môi trường ảo Python (`apps/api`)

Di chuyển vào thư mục API và sử dụng `uv` để tạo môi trường ảo và cài đặt thư viện:

```bash
cd apps/api

# 1. Khởi tạo virtual environment cô lập (.venv)
uv venv

# 2. Đồng bộ toàn bộ dependencies chính xác từ tệp uv.lock (kèm thư viện dev/test)
uv sync --all-extras --dev

# 3. Cài đặt gói gdmas ở chế độ Editable (để các runners nhận diện module src/)
uv pip install -e .

# Trở về thư mục gốc
cd ../..
```

### Bước 4: Cấu hình Frontend Web Client (`apps/web`)

Di chuyển vào thư mục Web Client và cài đặt gói giao diện:

```bash
cd apps/web

# Cài đặt toàn bộ thư viện React, Leaflet, Recharts từ pnpm-lock.yaml
pnpm install

# Kiểm tra biên dịch tĩnh (Type-check)
pnpm run build

# Trở về thư mục gốc
cd ../..
```

### Bước 5: Khởi động Database & Áp dụng Migration Schemas

1. **Khởi động PostgreSQL Container qua Docker:**
   ```bash
   docker compose up -d postgres
   ```
2. **Kiểm tra trạng thái container:**
   ```bash
   docker compose ps
   # Trạng thái phải hiển thị: Up (healthy) hoặc Up
   ```
3. **Áp dụng toàn bộ Lược đồ Cơ sở Dữ liệu với Alembic:**
   ```bash
   cd apps/api
   uv run alembic upgrade head
   cd ../..
   ```
4. **Kiểm tra 7 bảng đã sẵn sàng trong database:**
   ```bash
   docker exec -it gdmas-postgres psql -U gdmas_user -d gdmas_db -c "\dt"
   ```
   Kết quả kỳ vọng hiển thị danh sách 7 bảng:
   - `earthquakes`
   - `daily_aggregates`
   - `earthquake_clusters`
   - `disaster_predictions`
   - `ingestion_logs`
   - `analysis_runs`
   - `alembic_version`

---

## 4. Lệnh Thực Thi 7 Khối Dịch Vụ Độc Lập (7 Terminals Commands)

Sau khi hoàn tất cấu hình, mở **7 cửa sổ terminal độc lập** để chạy 7 khối dịch vụ:

| Terminal | Tên Khối Dịch Vụ | Thư mục làm việc | Câu lệnh thực thi chuẩn xác |
| :---: | :--- | :--- | :--- |
| **Terminal 1** | **Database PostgreSQL 16** | Thư mục gốc `GDMAS/` | `docker compose up postgres` |
| **Terminal 2** | **Data Ingestion Service** | `GDMAS/apps/api` | `uv run python -m gdmas.services.ingestion.runner` |
| **Terminal 3** | **Data Analysis Service** | `GDMAS/apps/api` | `uv run python -m gdmas.services.analysis.runner` |
| **Terminal 4** | **Clustering Service** | `GDMAS/apps/api` | `uv run python -m gdmas.services.clustering.runner` |
| **Terminal 5** | **Prediction Service** | `GDMAS/apps/api` | `uv run python -m gdmas.services.prediction.runner` |
| **Terminal 6** | **Database REST API Server** | `GDMAS/apps/api` | `uv run uvicorn gdmas.main:app --reload --port 8000` |
| **Terminal 7** | **Frontend Web Client** | `GDMAS/apps/web` | `pnpm dev --port 3000` |

> [!TIP]
> Sử dụng cú pháp `uv run python -m ...` giúp loại bỏ hoàn toàn rủi ro sai lệch phiên bản Python hoặc lỗi Windows App Execution Alias trên Windows 10/11.

---

## 5. Lệnh Kiểm Tra & Xác Nhận Cấu Hình Thành Công (Smoke Test)

Sau khi khởi chạy, thực hiện các lệnh kiểm tra nhanh để đảm bảo các thành phần liên kết hoàn hảo:

### 1. Kiểm tra API Healthcheck
Gửi yêu cầu kiểm tra sức khỏe hệ thống:
```bash
# Windows PowerShell:
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/health"

# Linux / macOS / Git Bash:
curl -s http://localhost:8000/api/v1/health | jq .
```
Phản hồi hợp lệ:
```json
{
  "status": "healthy",
  "database": "connected",
  "version": "1.0.0"
}
```

### 2. Kiểm tra giao diện Dashboard
Mở trình duyệt web truy cập địa chỉ: `http://localhost:3000`. Giao diện Dark Mode của GDMAS phải hiển thị bản đồ Leaflet và các thẻ thống kê mà không có lỗi console màu đỏ.

### 3. Chạy bộ kiểm thử tự động nội bộ (Local Test Suite)
```bash
bash scripts/test.sh
```
Nếu toàn bộ kiểm tra hiển thị màu xanh và báo cáo đạt độ phủ mã nguồn $\ge 70\%$, hệ thống cấu hình hoàn toàn chuẩn xác.

---

## 6. Khắc Phục Sự Cố Cấu Hình Thường Gặp (Troubleshooting)

### Sự cố 1: Lỗi "Python was not found" hoặc tự động mở Microsoft Store
- **Nguyên nhân:** Windows App Execution Alias chiếm quyền lệnh `python`.
- **Khắc phục:**
  1. Thay thế câu lệnh bằng `uv run python ...`
  2. Hoặc vào **Settings > Apps > Advanced app settings > App execution aliases**, tắt công tắc của `python.exe` và `python3.exe`.

### Sự cố 2: Lỗi "Bind for 0.0.0.0:5432 failed: port is already allocated"
- **Nguyên nhân:** Cổng 5432 đang bị chiếm bởi dịch vụ PostgreSQL cài đặt sẵn trên máy host.
- **Khắc phục:**
  - Cách 1: Tắt PostgreSQL trên máy host: `Stop-Service postgresql*` (PowerShell Admin).
  - Cách 2: Đổi cổng host sang `5433` trong `docker-compose.yml`:
    ```yaml
    ports:
      - "5433:5432"
    ```
    và sửa biến `DB_PORT=5433` trong tệp `.env`.

### Sự cố 3: Lỗi `ModuleNotFoundError: No module named 'gdmas'`
- **Nguyên nhân:** Chưa cài đặt thư mục `apps/api/src` vào môi trường ảo.
- **Khắc phục:**
  ```bash
  cd apps/api
  uv pip install -e .
  ```

### Sự cố 4: Docker Desktop không thể kết nối (`Cannot connect to Docker daemon`)
- **Khắc phục:** Mở ứng dụng **Docker Desktop**, đợi biểu tượng góc trái chuyển sang xanh lá (Docker Engine running). Với Windows, vào **Settings > Resources > WSL integration**, đảm bảo đã tích chọn distro WSL của bạn.

---

## 7. Tài liệu Liên quan
- Sổ tay vận hành 7 Terminals: [workflow.md](GDMAS/docs/workflow.md)
- Quản lý lệnh Python với UV: [uv-commands.md](GDMAS/docs/guides/python/uv-commands.md)
- Quản lý lệnh PostgreSQL: [postgres-commands.md](GDMAS/docs/guides/database/postgres-commands.md)
- Quản lý lệnh Frontend PNPM: [npm-commands.md](GDMAS/docs/guides/frontend/npm-commands.md)
- Đặc tả API: [API.md](GDMAS/docs/api/API.md)
