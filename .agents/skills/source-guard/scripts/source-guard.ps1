[CmdletBinding()]
param (
    [Parameter(Mandatory=$false)]
    [switch]$Strict,

    [Parameter(Mandatory=$false)]
    [switch]$UpdateMemory,

    [Parameter(Mandatory=$false)]
    [string]$Type,

    [Parameter(Mandatory=$false)]
    [string]$Scope,

    [Parameter(Mandatory=$false)]
    [string]$Desc,

    [Parameter(Mandatory=$false)]
    [string[]]$Bullets,

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
$statusOutput = git status --porcelain -uall 2>$null
$lines = @()
if ($statusOutput) {
    $lines = $statusOutput -split "`r?`n" | Where-Object { $_ -match "\S" }
}

$deletedFiles = @()
$modifiedFiles = @()
$addedFiles = @()
$untrackedFiles = @()

# Danh mục tệp lõi kiến trúc cần bảo vệ đặc biệt (cấm sửa đổi hoặc kiểm duyệt nghiêm ngặt)
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
            $warnings += ("CẢNH BÁO TỆP LÕI: Tệp '{0}' là tệp kiến trúc nhạy cảm đang bị chỉnh sửa. Hãy đảm bảo chỉ bổ sung router/config mới mà không làm thay đổi logic cũ." -f $f)
        }
    }
}

# Cảnh báo 3: Tỷ lệ dòng xóa quá cao
if ($deletions -gt 0 -and $deletions -gt $insertions) {
    $warnings += ("CẢNH BÁO TỶ LỆ DÒNG: Số dòng bị xóa ({0}) lớn hơn số dòng thêm mới ({1}). Hãy ưu tiên phương pháp bổ sung thêm mới thay vì ghi đè mã nguồn." -f $deletions, $insertions)
}

# 4. Xuất kết quả thẩm định ra màn hình
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

# 5. Ghi báo cáo thẩm định vào OutputFile (.agents/notes/changes/source-guard-report.md)
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

# 6. Tự động cập nhật Context Memory (-UpdateMemory) hoàn toàn động (Generic Dynamic Engine)
if ($UpdateMemory) {
    $branch = (git branch --show-current 2>$null).Trim()
    if (-not $branch) { $branch = "main" }

    # 6.1. Suy luận Type, Scope, Desc động từ tham số hoặc cây thư mục
    $activeType = $Type
    $activeScope = $Scope
    $activeDesc = $Desc
    $activeBulletsList = New-Object System.Collections.Generic.List[string]

    if ($Bullets -and $Bullets.Count -gt 0) {
        foreach ($b in $Bullets) { $activeBulletsList.Add($b) }
    }

    $allChangedFiles = @($addedFiles + $untrackedFiles + $modifiedFiles)
    $fileListStr = ($allChangedFiles -join " ")

    # Nếu chưa truyền tham số, tự động phân tích động theo cấu trúc kiến trúc GDMAS
    if (-not $activeType -or -not $activeScope -or -not $activeDesc) {
        if ($branch -match "^([a-z]+)/([a-z0-9_-]+)-(.*)$") {
            if (-not $activeType) { $activeType = $Matches[1] }
            if (-not $activeScope) { $activeScope = $Matches[2] }
        }

        if ($fileListStr -match "apps/web/src/components/charts") {
            if (-not $activeType) { $activeType = "feat" }
            if (-not $activeScope) { $activeScope = "web" }
            if (-not $activeDesc) { $activeDesc = "trực quan hóa biểu đồ chuỗi thời gian địa chấn" }
        } elseif ($fileListStr -match "apps/web/src/layouts") {
            if (-not $activeType) { $activeType = "feat" }
            if (-not $activeScope) { $activeScope = "web" }
            if (-not $activeDesc) { $activeDesc = "cập nhật cấu trúc layout giao diện frontend" }
        } elseif ($fileListStr -match "apps/web") {
            if (-not $activeType) { $activeType = "feat" }
            if (-not $activeScope) { $activeScope = "web" }
            if (-not $activeDesc) { $activeDesc = "cập nhật giao diện người dùng và tương tác frontend" }
        } elseif ($fileListStr -match "apps/api/src/gdmas/services/ingestion") {
            if (-not $activeType) { $activeType = "feat" }
            if (-not $activeScope) { $activeScope = "ingestion" }
            if (-not $activeDesc) { $activeDesc = "cập nhật tiến trình nạp dữ liệu USGS" }
        } elseif ($fileListStr -match "apps/api/src/gdmas/services/analysis") {
            if (-not $activeType) { $activeType = "feat" }
            if (-not $activeScope) { $activeScope = "analysis" }
            if (-not $activeDesc) { $activeDesc = "cập nhật thuật toán phân tích chuỗi thời gian" }
        } elseif ($fileListStr -match "apps/api/src/gdmas/services/clustering") {
            if (-not $activeType) { $activeType = "feat" }
            if (-not $activeScope) { $activeScope = "clustering" }
            if (-not $activeDesc) { $activeDesc = "cập nhật thuật toán gom cụm không gian" }
        } elseif ($fileListStr -match "apps/api/src/gdmas/services/prediction") {
            if (-not $activeType) { $activeType = "feat" }
            if (-not $activeScope) { $activeScope = "prediction" }
            if (-not $activeDesc) { $activeDesc = "cập nhật mô hình dự báo địa chấn" }
        } elseif ($fileListStr -match "apps/api/src/gdmas/realtime") {
            if (-not $activeType) { $activeType = "feat" }
            if (-not $activeScope) { $activeScope = "realtime" }
            if (-not $activeDesc) { $activeDesc = "cập nhật dịch vụ streaming dữ liệu SSE" }
        } elseif ($fileListStr -match "apps/api/src/gdmas/db" -or $fileListStr -match "alembic") {
            if (-not $activeType) { $activeType = "feat" }
            if (-not $activeScope) { $activeScope = "db" }
            if (-not $activeDesc) { $activeDesc = "cập nhật cấu trúc cơ sở dữ liệu và migrations" }
        } elseif ($fileListStr -match "apps/api") {
            if (-not $activeType) { $activeType = "feat" }
            if (-not $activeScope) { $activeScope = "api" }
            if (-not $activeDesc) { $activeDesc = "cập nhật dịch vụ backend và các endpoint xử lý dữ liệu" }
        } elseif ($fileListStr -match "contracts/") {
            if (-not $activeType) { $activeType = "chore" }
            if (-not $activeScope) { $activeScope = "contracts" }
            if (-not $activeDesc) { $activeDesc = "chuẩn hóa hợp đồng dữ liệu dùng chung API-Web" }
        } elseif ($fileListStr -match "docs/setup") {
            if (-not $activeType) { $activeType = "docs" }
            if (-not $activeScope) { $activeScope = "setup" }
            if (-not $activeDesc) { $activeDesc = "cập nhật hướng dẫn cài đặt và cấu hình môi trường" }
        } elseif ($fileListStr -match "docs/architecture") {
            if (-not $activeType) { $activeType = "docs" }
            if (-not $activeScope) { $activeScope = "architecture" }
            if (-not $activeDesc) { $activeDesc = "cập nhật tài liệu kiến trúc hệ thống và luồng dữ liệu" }
        } elseif ($fileListStr -match "docs/") {
            if (-not $activeType) { $activeType = "docs" }
            if (-not $activeScope) { $activeScope = "core" }
            if (-not $activeDesc) { $activeDesc = "cập nhật hệ thống tài liệu kỹ thuật dự án" }
        } elseif ($fileListStr -match "\.agents") {
            if (-not $activeType) { $activeType = "chore" }
            if (-not $activeScope) { $activeScope = "agents" }
            if (-not $activeDesc) { $activeDesc = "chuẩn hóa và tối ưu hóa các kỹ năng AI agent" }
        } elseif ($fileListStr -match "scripts/") {
            if (-not $activeType) { $activeType = "chore" }
            if (-not $activeScope) { $activeScope = "scripts" }
            if (-not $activeDesc) { $activeDesc = "cập nhật kịch bản kiểm thử và tự động hóa" }
        } else {
            # Khi working tree sạch, đọc thông tin từ commit gần nhất của nhánh
            $latestLog = (git log -1 --pretty=format:"%s" 2>$null)
            if ($latestLog -match "^([a-z]+)\(([^)]+)\):\s*(.+)$") {
                if (-not $activeType) { $activeType = $Matches[1] }
                if (-not $activeScope) { $activeScope = $Matches[2] }
                if (-not $activeDesc) { $activeDesc = $Matches[3] }
            } else {
                if (-not $activeType) { $activeType = "chore" }
                if (-not $activeScope) { $activeScope = "project" }
                if (-not $activeDesc) { $activeDesc = "cập nhật tài nguyên và cấu hình dự án" }
            }
        }
    }

    # Sinh bullets tóm tắt động từ danh sách tệp nếu chưa có
    if ($activeBulletsList.Count -eq 0) {
        if ($allChangedFiles.Count -gt 0) {
            $sampleFiles = $allChangedFiles | Select-Object -First 4
            foreach ($sf in $sampleFiles) {
                $activeBulletsList.Add("Cập nhật/bổ sung tệp: " + $sf)
            }
            if ($allChangedFiles.Count -gt 4) {
                $activeBulletsList.Add(("Và {0} tệp khác liên quan..." -f ($allChangedFiles.Count - 4)))
            }
        } else {
            $activeBulletsList.Add("Trạng thái làm việc gần nhất trên nhánh " + $branch + ": " + $activeDesc)
        }
    }

    # 6.2. Đọc và bảo toàn toàn bộ lịch sử các nhánh đã có trong Section 6
    $preservedBranches = New-Object 'System.Collections.Generic.Dictionary[string, System.Collections.Generic.List[string]]'
    if (Test-Path $MemoryFile) {
        $rawLines = [System.IO.File]::ReadAllLines($MemoryFile, [System.Text.Encoding]::UTF8)
        $inHistory = $false
        $currentBranchKey = ""
        foreach ($rLine in $rawLines) {
            if ($rLine -match "^## 6\.") {
                $inHistory = $true
                continue
            }
            if ($inHistory) {
                if ($rLine -match "^### 🔖 \[Nhánh:\s*([^\]]+)\]") {
                    $currentBranchKey = $Matches[1].Trim()
                    if (-not $preservedBranches.ContainsKey($currentBranchKey)) {
                        $preservedBranches[$currentBranchKey] = New-Object System.Collections.Generic.List[string]
                    }
                    $preservedBranches[$currentBranchKey].Add($rLine)
                } elseif ($currentBranchKey -and $rLine -match "\S") {
                    $preservedBranches[$currentBranchKey].Add($rLine)
                }
            }
        }
    }

    # 6.3. Cập nhật bản ghi Section 6 cho nhánh hiện tại
    $latestHash = (git rev-parse --short HEAD 2>$null).Trim()
    $statusText = if ($lines.Count -gt 0) { "Đang phát triển (Có " + $lines.Count + " tệp thay đổi)" } else { "Đã đồng bộ sạch sẽ (Commit: " + $latestHash + ")" }

    $currentBranchHistory = New-Object System.Collections.Generic.List[string]
    $currentBranchHistory.Add("### 🔖 [Nhánh: " + $branch + "] - Cập nhật: " + $timestamp)
    $currentBranchHistory.Add("- **Trạng thái:** " + $statusText)
    $currentBranchHistory.Add("- **Đánh dấu phân loại:** ``" + $activeType + "(" + $activeScope + ")``")
    $currentBranchHistory.Add("- **Tiêu đề thay đổi chính:** " + $activeDesc)
    foreach ($b in $activeBulletsList) {
        $currentBranchHistory.Add("  * " + $b)
    }
    $currentBranchHistory.Add("")

    # Nhánh hiện tại luôn được đưa vào danh mục
    $preservedBranches[$branch] = $currentBranchHistory

    # 6.4. Xây dựng tài liệu Context Memory hoàn chỉnh (Bảo toàn chuẩn 1-4, cập nhật 5 & 6)
    $doc = New-Object System.Collections.Generic.List[string]
    $doc.Add("# [GDMAS CONTEXT MEMORY SNAPSHOT]")
    $doc.Add("")
    $doc.Add("- **Phiên bản:** 2.0 (Bộ Nhớ Ngữ Cảnh Tích Lũy Đa Nhánh - Token Saver)")
    $doc.Add("- **Cập nhật lần cuối:** " + $timestamp)
    $doc.Add("- **Dự án:** Global Disaster Monitoring & Analysis System (GDMAS)")
    $doc.Add("")
    $doc.Add("---")
    $doc.Add("")
    $doc.Add("## 1. Bản Đồ Kiến Trúc Lõi & 7 Terminals")
    $doc.Add("Hệ thống Microservices/Modular chạy độc lập trên 7 cửa sổ terminal:")
    $doc.Add("- **T1 - Database:** PostgreSQL 16 Alpine (`docker compose up postgres`) - Múi giờ UTC (`TIMESTAMPTZ`), WGS84.")
    $doc.Add("- **T2 - Ingestion:** Worker nạp dữ liệu USGS 5 phút/lần (`python -m gdmas.services.ingestion.runner`).")
    $doc.Add("- **T3 - Analysis:** Phân tích Time-Series 5 phút/lần (`python -m gdmas.services.analysis.runner`).")
    $doc.Add("- **T4 - Clustering:** Gom cụm DBSCAN/KMeans 1 ngày/lần (`python -m gdmas.services.clustering.runner`).")
    $doc.Add("- **T5 - Prediction:** Dự báo & phân loại (`t+1`) 5 phút/lần (`python -m gdmas.services.prediction.runner`).")
    $doc.Add("- **T6 - API:** FastAPI REST & SSE tại port 8000 (`uv run uvicorn gdmas.main:app --port 8000`).")
    $doc.Add("- **T7 - Web Client:** React + Vite + Tailwind tại port 3000 (`pnpm dev --port 3000`).")
    $doc.Add("")
    $doc.Add("---")
    $doc.Add("")
    $doc.Add("## 2. Yêu Cầu 6 Patterns Chuỗi Thời Gian (Bắt buộc)")
    $doc.Add("1. **Biểu diễn thời gian:** 3 biểu đồ (Line chart, Scatter plot, Histogram) theo Ngày / Tuần / Tháng.")
    $doc.Add("2. **Trend Analysis:** Đường xu hướng sau khi Re-sampling Tháng/Tuần.")
    $doc.Add("3. **Seasonality:** Chu kỳ mùa vụ (Seasonal line) sau khi Re-sampling Tháng/Tuần.")
    $doc.Add("4. **Tương quan:** Heatmap / Correlation Matrix đa biến định lượng.")
    $doc.Add("5. **Dự báo định lượng (`t+1`):** Giá trị dự báo số lượng sự kiện ngày kế tiếp kèm khoảng tin cậy.")
    $doc.Add("6. **Phân loại (`t+1`):** Nhãn phân loại mức độ hoạt động địa chấn ngày kế tiếp.")
    $doc.Add("")
    $doc.Add("---")
    $doc.Add("")
    $doc.Add("## 3. Nguyên Tắc Bất Biến (Open-Closed Principle - RULE-03)")
    $doc.Add("- **CẤM:** Không xóa file hiện hữu, không đổi tên file, không sửa đổi signature hàm cũ, không nhúng worker ngầm vào `main.py`.")
    $doc.Add("- **ĐƯỢC PHÉP:** Bổ sung file `runner.py` mới, router mới, schema/model mới, component mới trong `components/charts/`, test mới.")
    $doc.Add("")
    $doc.Add("---")
    $doc.Add("")
    $doc.Add("## 4. Chỉ Mục Kỹ Năng On-Demand (.agents/skills)")
    $doc.Add("> [!IMPORTANT]")
    $doc.Add("> **Quy tắc On-Demand & Tiết kiệm Token:** Các kỹ năng `generate-commit` và `git-commit-push` ƯU TIÊN ĐỌC TRỰC TIẾP Mục 5 & Mục 6 dưới đây thay vì chạy quét lại toàn bộ `git status` và `git diff`.")
    $doc.Add("")
    $doc.Add("| Tên Kỹ Năng | Khi Nào Cần Tải / Kích Hoạt | Thư Mục |")
    $doc.Add("| :--- | :--- | :--- |")
    $doc.Add("| **`source-guard`** | Thẩm định an toàn mã nguồn, cập nhật bộ nhớ tích lũy đa nhánh | `.agents/skills/source-guard/` |")
    $doc.Add("| **`generate-commit`**| Đọc nhanh Context Memory để sinh Conventional Commit tiếng Việt | `.agents/skills/generate-commit/` |")
    $doc.Add("| **`git-commit-push`** | Đọc nhanh Context Memory để commit và push đúng nhánh | `.agents/skills/git-commit-push/` |")
    $doc.Add("| **`propose-branch`** | Đề xuất tên branch theo task description và lưu bản ghi nhánh | `.agents/skills/propose-branch/` |")
    $doc.Add("| **`git-branch-push`** | Chuyển, tạo nhánh mới và đẩy lên GitHub | `.agents/skills/git-branch-push/` |")
    $doc.Add("")
    $doc.Add("---")
    $doc.Add("")
    $doc.Add("## 5. Trạng Thái Hoạt Động Hiện Thời (Active Branch Snapshot)")
    $doc.Add("- **Nhánh hoạt động (Active Branch):** ``" + $branch + "``")
    $statusMsg = if ($lines.Count -gt 0) { "⚠️ Có " + $lines.Count + " tệp đang thay đổi" } else { "✅ Clean (Đã đồng bộ)" }
    $doc.Add("- **Trạng thái Working Tree:** " + $statusMsg)
    $doc.Add("- **Phân loại đề xuất (Type/Scope):** ``" + $activeType + "(" + $activeScope + ")``")
    $doc.Add("- **Tiêu đề commit đề xuất (Subject):** " + $activeDesc)
    $doc.Add("- **Tóm tắt thay đổi gần nhất:**")
    foreach ($b in $activeBulletsList) {
        $doc.Add("  * " + $b)
    }
    $evalMsg = if ($hasViolations) { "❌ Cần khôi phục tệp vi phạm" } elseif ($warnings.Count -gt 0) { "⚠️ Có cảnh báo" } else { "✅ An toàn (Open-Closed)" }
    $doc.Add("- **Đánh giá an toàn mã nguồn:** " + $evalMsg)
    $doc.Add("")
    $doc.Add("---")
    $doc.Add("")
    $doc.Add("## 6. Sổ Nhật Ký Phát Triển & Thay Đổi Theo Nhánh (Cumulative Branch Milestones)")

    # Đưa nhánh hiện tại lên đầu tiên
    if ($preservedBranches.ContainsKey($branch)) {
        foreach ($line in $preservedBranches[$branch]) {
            $doc.Add($line)
        }
    }

    # Kế thừa tất cả các nhánh khác trong lịch sử
    foreach ($bKey in $preservedBranches.Keys) {
        if ($bKey -ne $branch) {
            foreach ($line in $preservedBranches[$bKey]) {
                $doc.Add($line)
            }
        }
    }

    $memDir = [System.IO.Path]::GetDirectoryName($MemoryFile)
    if ($memDir -and -not (Test-Path $memDir)) { New-Item -ItemType Directory -Path $memDir -Force | Out-Null }
    [System.IO.File]::WriteAllLines($MemoryFile, $doc, $utf8BOM)
    Write-Host ("[+] Đã cập nhật bộ nhớ tích lũy ngữ cảnh vào: {0}" -f $MemoryFile) -ForegroundColor Green
}

if ($hasViolations -and $Strict) {
    exit 1
}
exit 0
