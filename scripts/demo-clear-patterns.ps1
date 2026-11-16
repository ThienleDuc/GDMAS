<#
.SYNOPSIS
    Kịch bản xóa toàn bộ dữ liệu CSDL phục vụ BUỔI DEMO (Bước 2).
.DESCRIPTION
    Xóa sạch dữ liệu trong PostgreSQL để kiểm thử khả năng xử lý lỗi của Web ở Bước 3.
    Mặc định xóa: Toàn bộ bảng Patterns VÀ bảng sự kiện địa chấn (earthquake_events).
.EXAMPLE
    .\scripts\demo-clear-patterns.ps1 -Force
    .\scripts\demo-clear-patterns.ps1 -PatternsOnly
#>

param (
    [Parameter(Mandatory=$false)]
    [switch]$PatternsOnly,

    [Parameter(Mandatory=$false)]
    [switch]$Force
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "==========================================================================" -ForegroundColor Red
Write-Host "     GDMAS DEMO - BƯỚC 2: XÓA DỮ LIỆU CSDL ĐỂ KIỂM THỬ GIAO DIỆN WEB      " -ForegroundColor Yellow
Write-Host "==========================================================================" -ForegroundColor Red
Write-Host ""

$pgContainer = docker ps --filter "name=gdmas-postgres" --format "{{.Names}}"
if (-not $pgContainer) {
    Write-Host "[!] Lỗi: Container 'gdmas-postgres' chưa được khởi chạy." -ForegroundColor Red
    Write-Host "    Vui lòng chạy: docker compose up -d postgres" -ForegroundColor Yellow
    exit 1
}

function Query-Count($tableName) {
    $sql = "SELECT COUNT(*) FROM $tableName;"
    $res = docker exec gdmas-postgres psql -U gdmas_user -d gdmas_db -t -A -c $sql 2>$null
    if ($res) {
        $str = ($res -join "").Trim()
        if ($str -match "^\d+$") { return [int]$str }
    }
    return 0
}

Write-Host "[*] Đang kiểm tra số lượng bản ghi hiện tại trong CSDL..." -ForegroundColor Cyan

$tblAnalysis = "analysis_results"
$tblPrediction = "prediction_results"
$tblClassification = "classification_results"
$tblClustering = "clustering_results"
$tblClustMap = "clustering_event_mapping"
$tblEvents = "earthquake_events"
$tblRuns = "service_runs"

$cntAnalysisBefore = Query-Count $tblAnalysis
$cntPredBefore = Query-Count $tblPrediction
$cntClassBefore = Query-Count $tblClassification
$cntClustBefore = Query-Count $tblClustering
$cntClustMapBefore = Query-Count $tblClustMap
$cntEventsBefore = Query-Count $tblEvents

Write-Host "  -> Bảng $tblAnalysis (Pattern 1-4)    : $cntAnalysisBefore bản ghi" -ForegroundColor Gray
Write-Host "  -> Bảng $tblPrediction (Pattern 5)      : $cntPredBefore bản ghi" -ForegroundColor Gray
Write-Host "  -> Bảng $tblClassification (Pattern 6)  : $cntClassBefore bản ghi" -ForegroundColor Gray
Write-Host "  -> Bảng $tblClustering (DBSCAN/KMeans)  : $cntClustBefore bản ghi" -ForegroundColor Gray
Write-Host "  -> Bảng $tblClustMap                    : $cntClustMapBefore bản ghi" -ForegroundColor Gray
Write-Host "  -> Bảng $tblEvents (Sự kiện địa chấn)   : $cntEventsBefore bản ghi" -ForegroundColor Gray
Write-Host ""

if ($PatternsOnly) {
    Write-Host "[i] Chế độ: Chỉ xóa dữ liệu kết quả 6 PATTERNS (Giữ lại bảng sự kiện thô)." -ForegroundColor Cyan
} else {
    Write-Host "[!] CHẾ ĐỘ DEMO BƯỚC 2: Xóa sạch toàn bộ CSDL (Gồm cả 6 Patterns và Sự kiện địa chấn)." -ForegroundColor Yellow
    Write-Host "    Mục đích: Giúp giao diện Web phản hồi trạng thái dữ liệu trống 100%!" -ForegroundColor Gray
}

if (-not $Force) {
    $confirm = Read-Host "Bạn có chắc chắn muốn xóa dữ liệu phục vụ Bước 2 buổi Demo? (Y/N)"
    if ($confirm -ne "Y" -and $confirm -ne "y") {
        Write-Host "[-] Hủy bỏ thao tác xóa. Dữ liệu được bảo toàn nguyên vẹn." -ForegroundColor Green
        exit 0
    }
}

Write-Host "`n[*] Đang thực hiện lệnh TRUNCATE trong PostgreSQL..." -ForegroundColor Yellow

if ($PatternsOnly) {
    $truncateSql = "TRUNCATE TABLE clustering_event_mapping, clustering_results, analysis_results, prediction_results, classification_results CASCADE;"
    docker exec gdmas-postgres psql -U gdmas_user -d gdmas_db -c $truncateSql | Out-Null
} else {
    $truncateSql = "TRUNCATE TABLE clustering_event_mapping, clustering_results, analysis_results, prediction_results, classification_results, service_runs, earthquake_events RESTART IDENTITY CASCADE;"
    docker exec gdmas-postgres psql -U gdmas_user -d gdmas_db -c $truncateSql | Out-Null
}

# Kích hoạt broadcast SSE thời gian thực để Web tự động dọn sạch giao diện ngay lập tức mà không cần F5
try {
    Invoke-RestMethod -Uri "http://localhost:8000/api/v1/stream/broadcast-cleared" -Method Post -TimeoutSec 2 -ErrorAction SilentlyContinue | Out-Null
} catch {}

$cntAnalysisAfter = Query-Count $tblAnalysis
$cntPredAfter = Query-Count $tblPrediction
$cntClassAfter = Query-Count $tblClassification
$cntClustAfter = Query-Count $tblClustering
$cntClustMapAfter = Query-Count $tblClustMap
$cntEventsAfter = Query-Count $tblEvents

Write-Host "`n[+] KẾT QUẢ SAU KHI XÓA THÀNH CÔNG:" -ForegroundColor Green
Write-Host "  [✓] $tblAnalysis       : $cntAnalysisAfter bản ghi (Đã xóa $cntAnalysisBefore bản ghi)" -ForegroundColor Green
Write-Host "  [✓] $tblPrediction         : $cntPredAfter bản ghi (Đã xóa $cntPredBefore bản ghi)" -ForegroundColor Green
Write-Host "  [✓] $tblClassification     : $cntClassAfter bản ghi (Đã xóa $cntClassBefore bản ghi)" -ForegroundColor Green
Write-Host "  [✓] $tblClustering         : $cntClustAfter bản ghi (Đã xóa $cntClustBefore bản ghi)" -ForegroundColor Green
Write-Host "  [✓] $tblClustMap   : $cntClustMapAfter bản ghi (Đã xóa $cntClustMapBefore bản ghi)" -ForegroundColor Green
Write-Host "  [✓] $tblEvents          : $cntEventsAfter bản ghi (Đã xóa $cntEventsBefore bản ghi)" -ForegroundColor Green

Write-Host ""
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "               HƯỚNG DẪN THỰC HIỆN BƯỚC TIẾP THEO TRONG BUỔI DEMO         " -ForegroundColor White
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "  👉 BƯỚC 3: Mở lại trình duyệt Web (http://localhost:3000)." -ForegroundColor Yellow
Write-Host "     -> Giao diện TỰ ĐỘNG dọn sạch và hiện cảnh báo Demo Bước 3 qua SSE!" -ForegroundColor Yellow
Write-Host "  👉 BƯỚC 4: Sau khi hội đồng xem xong lỗi, hãy chạy kịch bản phục hồi:" -ForegroundColor Cyan
Write-Host "     -> .\scripts\demo-init-patterns.ps1" -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host ""
