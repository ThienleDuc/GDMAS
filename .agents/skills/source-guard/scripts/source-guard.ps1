[CmdletBinding()]
param (
    [Parameter(Mandatory=$false)]
    [switch]$Strict,

    [Parameter(Mandatory=$false)]
    [switch]$UpdateMemory,

    [Parameter(Mandatory=$false)]
    [string]$OutputFile = ".agents/notes/changes/source-guard-report.md",

    [Parameter(Mandatory=$false)]
    [string]$MemoryFile = ".agents/notes/memory/context-memory.md"
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       GDMAS SOURCE CODE INTEGRITY GUARD (OCP)          " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Quét trạng thái git status
$statusOutput = git status --porcelain -uall
$lines = @()
if ($statusOutput) {
    $lines = $statusOutput -split "`r?`n" | Where-Object { $_ -match "\S" }
}

$deletedFiles = @()
$modifiedFiles = @()
$addedFiles = @()
$untrackedFiles = @()

# Danh mục tệp lõi cần bảo vệ đặc biệt (cấm sửa đổi hoặc cần kiểm duyệt nghiêm ngặt)
$coreProtectedPatterns = @(
    "apps/api/src/gdmas/main.py",
    "apps/api/src/gdmas/db/connection.py",
    "apps/api/src/gdmas/db/base.py",
    "contracts/",
    "docs/quyuocchung.md"
)

$protectedModifications = @()

foreach ($line in $lines) {
    $code = $line.Substring(0, 2).Trim()
    $file = $line.Substring(3).Trim()

    if ($code -match "D") {
        $deletedFiles += $file
    } elseif ($code -match "M") {
        $modifiedFiles += $file
        foreach ($pattern in $coreProtectedPatterns) {
            if ($file -match [regex]::Escape($pattern)) {
                $protectedModifications += $file
                break
            }
        }
    } elseif ($code -match "A") {
        $addedFiles += $file
    } elseif ($code -eq "??") {
        $untrackedFiles += $file
    }
}

# 2. Thống kê số dòng thêm/xóa qua git diff
$diffStat = git diff --shortstat 2>$null
$insertions = 0
$deletions = 0
if ($diffStat -match "(\d+)\s+insertion") { $insertions = [int]$matches[1] }
if ($diffStat -match "(\d+)\s+deletion") { $deletions = [int]$matches[1] }

Write-Host ("--> Tổng số tệp thêm mới:       {0}" -f ($addedFiles.Count + $untrackedFiles.Count)) -ForegroundColor Green
Write-Host ("--> Tổng số tệp chỉnh sửa:      {0}" -f $modifiedFiles.Count) -ForegroundColor Yellow
Write-Host ("--> Tổng số tệp bị xóa:         {0}" -f $deletedFiles.Count) -ForegroundColor Red
Write-Host ("--> Dòng thêm mới (+):          {0}" -f $insertions) -ForegroundColor Green
Write-Host ("--> Dòng bị xóa (-):            {0}" -f $deletions) -ForegroundColor Yellow
Write-Host ""

# 3. Đánh giá tính tuân thủ nguyên tắc Open-Closed
$hasViolations = $false
$violations = @()
$warnings = @()

# Vi phạm 1: Cấm xóa tệp
if ($deletedFiles.Count -gt 0) {
    $hasViolations = $true
    foreach ($f in $deletedFiles) {
        $violations += ("CẤM XÓA TỆP: Tệp '{0}' đã bị xóa, vi phạm nguyên tắc bảo toàn mã nguồn gốc (Closed for Modification)." -f $f)
    }
}

# Vi phạm 2: Chỉnh sửa tệp lõi cần bảo vệ
if ($protectedModifications.Count -gt 0) {
    foreach ($f in $protectedModifications) {
        if ($Strict) {
            $hasViolations = $true
            $violations += ("VI PHẠM TỆP LÕI: Tệp bảo vệ '{0}' bị chỉnh sửa trong chế độ Strict." -f $f)
        } else {
            $warnings += ("CẢNH BÁO TỆP LÕI: Tệp '{0}' là tệp kiến trúc nhạy cảm đang bị chỉnh sửa. Hãy đảm bảo bạn chỉ bổ sung router/config mới mà không làm thay đổi logic cũ." -f $f)
        }
    }
}

# Cảnh báo 3: Tỷ lệ dòng xóa quá cao
if ($deletions -gt 0 -and $deletions -gt $insertions) {
    $warnings += ("CẢNH BÁO TỶ LỆ DÒNG: Số dòng bị xóa ({0}) lớn hơn số dòng thêm mới ({1}). Hãy ưu tiên phương pháp bổ sung thêm mới thay vì ghi đè mã nguồn." -f $deletions, $insertions)
}

# 4. Xuất kết quả thẩm định
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "             KẾT QUẢ THẨM ĐỊNH MÃ NGUỒN                 " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

if ($hasViolations) {
    Write-Host "❌ PHÁT HIỆN VI PHẠM NGUYÊN TẮC BẢO VỆ MÃ NGUỒN!" -ForegroundColor Red
    foreach ($v in $violations) {
        Write-Host ("  [!] {0}" -f $v) -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Khuyến nghị: Khôi phục lại các tệp bị xóa/sửa bằng lệnh 'git restore <file>' và triển khai theo hướng bổ sung thêm mới." -ForegroundColor Yellow
} elseif ($warnings.Count -gt 0) {
    Write-Host "⚠️ ĐẠT CHUẨN MỞ RỘNG (KÈM CẢNH BÁO CẦN LƯU Ý):" -ForegroundColor Yellow
    foreach ($w in $warnings) {
        Write-Host ("  [*] {0}" -f $w) -ForegroundColor Yellow
    }
} else {
    Write-Host "✅ XÁC NHẬN: Mã nguồn tuân thủ 100% nguyên tắc Open-Closed!" -ForegroundColor Green
    Write-Host "   Tất cả các thay đổi đều là BỔ SUNG THÊM MỚI mà không phá vỡ cấu trúc hiện tại." -ForegroundColor Green
}
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# 5. Ghi báo cáo thẩm định vào thư mục .agents/notes/changes/ (Lưu cục bộ)
$timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss (UTCzzz)")
$reportLines = @(
    "# [BIÊN BẢN KIỂM SOÁT BẢO VỆ MÃ NGUỒN - SOURCE GUARD REPORT]",
    "",
    ("- **Thời gian quét:** {0}" -f $timestamp),
    ("- **Trạng thái:** {0}" -f $(if ($hasViolations) { "❌ KHÔNG ĐẠT (VI PHẠM)" } elseif ($warnings.Count -gt 0) { "⚠️ CẢNH BÁO" } else { "✅ ĐẠT CHUẨN (HOÀN HẢO)" })),
    ("- **Số tệp thêm mới:** {0}" -f ($addedFiles.Count + $untrackedFiles.Count)),
    ("- **Số tệp chỉnh sửa:** {0}" -f $modifiedFiles.Count),
    ("- **Số tệp bị xóa:** {0}" -f $deletedFiles.Count),
    "",
    "---",
    "",
    "## 1. Chi Tiết Các Tệp Thay Đổi",
    "### Tệp Bổ Sung Mới (Được Khuyến Khích):"
)

if (($addedFiles.Count + $untrackedFiles.Count) -eq 0) {
    $reportLines += "- (Không có tệp thêm mới)"
} else {
    foreach ($f in ($addedFiles + $untrackedFiles)) { $reportLines += ("- ``A  {0}``" -f $f) }
}

$reportLines += ""
$reportLines += "### Tệp Chỉnh Sửa:"
if ($modifiedFiles.Count -eq 0) {
    $reportLines += "- (Không có tệp chỉnh sửa)"
} else {
    foreach ($f in $modifiedFiles) { $reportLines += ("- ``M  {0}``" -f $f) }
}

$reportLines += ""
$reportLines += "### Tệp Bị Xóa (Cần Tránh):"
if ($deletedFiles.Count -eq 0) {
    $reportLines += "- (Không có tệp bị xóa - Rất tốt!)"
} else {
    foreach ($f in $deletedFiles) { $reportLines += ("- ``D  {0}``" -f $f) }
}

$reportLines += ""
$reportLines += "---"
$reportLines += "*Báo cáo này được sinh tự động bởi kỹ năng source-guard và lưu trữ cục bộ tại .agents/notes/changes/.*"

$reportContent = $reportLines -join [Environment]::NewLine
$targetDir = [System.IO.Path]::GetDirectoryName($OutputFile)
if ($targetDir -and -not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

$utf8BOM = New-Object System.Text.UTF8Encoding $true
[System.IO.File]::WriteAllText($OutputFile, $reportContent, $utf8BOM)

# 6. Tự động cập nhật tệp Context Memory nếu có cờ -UpdateMemory
if ($UpdateMemory) {
    $branch = (git branch --show-current).Trim()
    $memLines = @(
        "# [GDMAS CONTEXT MEMORY SNAPSHOT]",
        "",
        "- **Phiên bản:** 1.0 (Tinh gọn cho Cửa Sổ Ngữ Cảnh)",
        ("- **Cập nhật lần cuối:** {0}" -f $timestamp),
        "- **Dự án:** Global Disaster Monitoring & Analysis System (GDMAS)",
        "",
        "---",
        "",
        "## 1. Bản Đồ Kiến Trúc Lõi & 7 Terminals",
        "Hệ thống Microservices/Modular chạy độc lập trên 7 cửa sổ terminal:",
        "- **T1 - Database:** PostgreSQL 16 Alpine (`docker compose up postgres`) - Múi giờ UTC (`TIMESTAMPTZ`), WGS84.",
        "- **T2 - Ingestion:** Worker nạp dữ liệu USGS 5 phút/lần (`python -m gdmas.services.ingestion.runner`).",
        "- **T3 - Analysis:** Phân tích Time-Series 5 phút/lần (`python -m gdmas.services.analysis.runner`).",
        "- **T4 - Clustering:** Gom cụm DBSCAN/KMeans 1 ngày/lần (`python -m gdmas.services.clustering.runner`).",
        "- **T5 - Prediction:** Dự báo & phân loại ($t+1$) 5 phút/lần (`python -m gdmas.services.prediction.runner`).",
        "- **T6 - API:** FastAPI REST & SSE tại port 8000 (`uv run uvicorn gdmas.main:app --port 8000`).",
        "- **T7 - Web Client:** React + Vite + Tailwind tại port 3000 (`pnpm dev --port 3000`).",
        "",
        "---",
        "",
        "## 2. Yêu Cầu 6 Patterns Chuỗi Thời Gian (Bắt buộc)",
        "1. **Biểu diễn thời gian:** 3 biểu đồ (Line chart, Scatter plot, Histogram) theo Ngày / Tuần / Tháng.",
        "2. **Trend Analysis:** Đường xu hướng sau khi Re-sampling Tháng/Tuần.",
        "3. **Seasonality:** Chu kỳ mùa vụ (Seasonal line) sau khi Re-sampling Tháng/Tuần.",
        "4. **Tương quan:** Heatmap / Correlation Matrix đa biến định lượng.",
        "5. **Dự báo định lượng ($t+1$):** Giá trị dự báo số lượng sự kiện ngày kế tiếp kèm khoảng tin cậy.",
        "6. **Phân loại ($t+1$):** Nhãn phân loại mức độ hoạt động địa chấn ngày kế tiếp.",
        "",
        "---",
        "",
        "## 3. Nguyên Tắc Bất Biến (Open-Closed Principle - RULE-03)",
        "- **CẤM:** Không xóa file hiện hữu, không đổi tên file, không sửa đổi signature hàm cũ, không nhúng worker ngầm vào `main.py`.",
        "- **ĐƯỢC PHÉP:** Bổ sung file `runner.py` mới, router mới, schema/model mới, component mới trong `components/charts/`, test mới.",
        "",
        "---",
        "",
        "## 4. Chỉ Mục Kỹ Năng On-Demand (.agents/skills)",
        "> [!IMPORTANT]",
        "> **Quy tắc On-Demand:** Agent KHÔNG đọc chi tiết các kỹ năng dưới đây trừ khi được người dùng chỉ định hoặc tác vụ yêu cầu đích danh.",
        "",
        "| Tên Kỹ Năng | Khi Nào Cần Tải / Kích Hoạt | Thư Mục |",
        "| :--- | :--- | :--- |",
        "| **`source-guard`** | Khi cần thẩm định an toàn mã nguồn, kiểm tra xóa/sửa file lõi | `.agents/skills/source-guard/` |",
        "| **`generate-commit`**| Khi người dùng yêu cầu soạn hoặc sinh Conventional Commit tiếng Việt | `.agents/skills/generate-commit/` |",
        "| **`git-commit-push`** | Khi người dùng yêu cầu tự động stage, commit và push lên remote | `.agents/skills/git-commit-push/` |",
        "| **`propose-branch`** | Khi bắt đầu tính năng mới hoặc yêu cầu đề xuất tên branch theo task | `.agents/skills/propose-branch/` |",
        "| **`git-branch-push`** | Khi người dùng yêu cầu chuyển, tạo nhánh mới và đẩy lên GitHub | `.agents/skills/git-branch-push/` |",
        "",
        "---",
        "",
        "## 5. Trạng Thái Không Gian Làm Việc Hiện Thời (Active State)",
        ("- **Nhánh Git hiện tại:** ``{0}``" -f $branch),
        ("- **Tệp đang thay đổi:** {0} tệp ({1} thêm mới, {2} chỉnh sửa, {3} xóa)" -f $lines.Count, ($addedFiles.Count + $untrackedFiles.Count), $modifiedFiles.Count, $deletedFiles.Count),
        ("- **Đánh giá an toàn mã nguồn:** {0}" -f $(if ($hasViolations) { "❌ Cần khôi phục tệp vi phạm" } else { "✅ An toàn (Open-Closed)" }))
    )

    $memDir = [System.IO.Path]::GetDirectoryName($MemoryFile)
    if ($memDir -and -not (Test-Path $memDir)) { New-Item -ItemType Directory -Path $memDir -Force | Out-Null }
    [System.IO.File]::WriteAllText($MemoryFile, ($memLines -join [Environment]::NewLine), $utf8BOM)
    Write-Host ("[+] Đã tự động cập nhật bộ nhớ ngữ cảnh vào: {0}" -f $MemoryFile) -ForegroundColor Green
}

if ($hasViolations -and $Strict) {
    exit 1
}
exit 0
