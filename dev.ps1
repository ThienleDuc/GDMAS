param (
    [switch]$Stop,
    [switch]$Logs,
    [switch]$Build
)

$ErrorActionPreference = "Stop"

function Show-Header {
    Write-Host ""
    Write-Host "==========================================================================" -ForegroundColor Cyan
    Write-Host "        GDMAS - GLOBAL DISASTER MONITORING & ANALYSIS SYSTEM              " -ForegroundColor White
    Write-Host "            MOI TRUONG PHAT TRIEN LOCAL (HOT-RELOAD 100%)                " -ForegroundColor Green
    Write-Host "==========================================================================" -ForegroundColor Cyan
    Write-Host ""
}

if ($Stop) {
    Show-Header
    Write-Host "[-] Dang dung toan bo 7 dich vu cua GDMAS..." -ForegroundColor Yellow
    docker compose down
    Write-Host "[+] Toan bo he thong da duoc dung an toan." -ForegroundColor Green
    exit 0
}

if ($Logs) {
    docker compose logs -f
    exit 0
}

Show-Header

Write-Host "[*] Khoi chay toan bo he thong voi Docker Compose Hot-Reload..." -ForegroundColor Yellow

if ($Build) {
    Write-Host "[*] Dang build lai cac image phat trien..." -ForegroundColor Yellow
    docker compose up -d --build
} else {
    docker compose up -d
}

Write-Host ""
Write-Host "==========================================================================" -ForegroundColor Green
Write-Host "                 HE THONG DA SAN SANG HOAT DONG!                          " -ForegroundColor White
Write-Host "==========================================================================" -ForegroundColor Green
Write-Host "  [T7] Frontend SPA Client  : http://localhost:3000   (Vite HMR Hot Reload)" -ForegroundColor Cyan
Write-Host "  [T6] Backend FastAPI & SSE: http://localhost:8000   (Uvicorn Hot Reload)" -ForegroundColor Cyan
Write-Host "  [--] Swagger API Docs     : http://localhost:8000/api/v1/docs" -ForegroundColor Gray
Write-Host "  [T1] PostgreSQL Database  : localhost:5432        (DB: gdmas_db, UTC)" -ForegroundColor Cyan
Write-Host "  [T2-T5] 4 Workers ngam    : Ingestion, Analysis, Clustering, Prediction" -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Green
Write-Host "  Mẹo: Bat ky sua doi file .py hoac .tsx deu TU DONG CAP NHAT TUC THI!" -ForegroundColor Yellow
Write-Host "  Dung he thong: go .\dev.ps1 -Stop hoac docker compose down" -ForegroundColor Gray
Write-Host "==========================================================================" -ForegroundColor Green
Write-Host ""
