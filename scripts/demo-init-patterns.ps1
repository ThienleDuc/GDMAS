<#
.SYNOPSIS
    Kịch bản khởi tạo và tính toán dữ liệu các Patterns phục vụ BUỔI DEMO (Bước 4).
.DESCRIPTION
    Tuân thủ quy trình kiểm thử đồ án:
    1. Kiểm tra CSDL và kích hoạt Backend Services (AI models đã build sẵn).
    2. Tự động tính toán Patterns 1-4 (Analysis: chuỗi thời gian, trend, seasonality, correlation).
    3. Tự động chạy thuật toán DBSCAN (Clustering) phân cụm ổ địa chấn.
    4. Tự động dự báo định lượng t+1 (Pattern 5) và phân loại rủi ro t+1 (Pattern 6).
    5. Nạp kết quả vào PostgreSQL và hiển thị trạng thái hoàn thành.
.EXAMPLE
    .\scripts\demo-init-patterns.ps1
#>

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "==========================================================================" -ForegroundColor Green
Write-Host "     GDMAS DEMO - BƯỚC 4: KÍCH HOẠT BACKEND SERVICES & KHỞI TẠO PATTERNS  " -ForegroundColor White
Write-Host "==========================================================================" -ForegroundColor Green
Write-Host ""

# Kiểm tra container gdmas-api và gdmas-postgres đang chạy
$apiContainer = docker ps --filter "name=gdmas-api" --format "{{.Names}}"
if (-not $apiContainer) {
    Write-Host "[!] Container 'gdmas-api' chưa chạy. Đang kích hoạt toàn bộ Docker Compose..." -ForegroundColor Yellow
    docker compose up -d
}

Write-Host "[*] Đang kích hoạt các Backend Services (Analysis, Clustering, Prediction)..." -ForegroundColor Cyan
Write-Host "    (Lưu ý: Các mô hình AI/ML đã được build sẵn, chỉ thực thi inference)" -ForegroundColor Gray
Write-Host ""

# Chạy module demo_seeder bên trong container gdmas-api
docker exec gdmas-api python -m gdmas.services.demo_seeder

Write-Host ""
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "               HƯỚNG DẪN THỰC HIỆN BƯỚC TIẾP THEO TRONG BUỔI DEMO         " -ForegroundColor White
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "  👉 BƯỚC 5: Mở Database PostgreSQL để chứng minh dữ liệu đã được xử lý:" -ForegroundColor Yellow
Write-Host "     docker exec -it gdmas-postgres psql -U gdmas_user -d gdmas_db -c '\dt'" -ForegroundColor Gray
Write-Host "  👉 BƯỚC 6: Mở lại giao diện Web (http://localhost:3000):" -ForegroundColor Cyan
Write-Host "     -> Tất cả biểu đồ chuỗi thời gian, dự báo t+1 và cụm địa chấn" -ForegroundColor Green
Write-Host "        đã được nạp lại đầy đủ và cập nhật theo thời gian thực!" -ForegroundColor Green
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host ""
