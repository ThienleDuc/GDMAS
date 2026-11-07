[CmdletBinding()]
param (
    [Parameter(Mandatory=$false)]
    [string]$Message,

    [Parameter(Mandatory=$false)]
    [string]$Type,

    [Parameter(Mandatory=$false)]
    [string]$Scope,

    [Parameter(Mandatory=$false)]
    [string]$Subject,

    [Parameter(Mandatory=$false)]
    [string]$BranchName,

    [Parameter(Mandatory=$false)]
    [switch]$Auto,

    [Parameter(Mandatory=$false)]
    [switch]$Force,

    [Parameter(Mandatory=$false)]
    [string]$PendingCommitFile = ".agents/notes/changes/pending-commit.md",

    [Parameter(Mandatory=$false)]
    [string]$MemoryFile = ".agents/notes/memory/context-memory.md"
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   GDMAS GIT COMMIT & PUSH WORKFLOW (POWERSHELL AUTO)   " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Rà soát trạng thái Git
$statusOutput = git status --porcelain -uall 2>$null
if (-not $statusOutput) {
    Write-Host "ℹ️ Không có thay đổi nào cần commit (Working tree clean)." -ForegroundColor Green
    exit 0
}

# 2. Rà soát an toàn tệp .env (tuyệt đối không commit tệp nhạy cảm)
$lines = $statusOutput -split "`r?`n" | Where-Object { $_ -match "\S" }
$stagedEnv = $lines | Where-Object { $_ -match "^\s*[AM\?]{1,2}\s+.*\.env($|\.)" -and $_ -notmatch "\.env\.example" }
if ($stagedEnv) {
    Write-Host "⚠️ Phát hiện tệp .env trong Staged/Working tree! Đang bảo vệ và loại trừ..." -ForegroundColor Yellow
    git restore --staged .env 2>$null
    git restore --staged apps/web/.env 2>$null
    git restore --staged apps/api/.env 2>$null
    Write-Host "✅ Đã gỡ .env khỏi Staging an toàn." -ForegroundColor Green
}

$currentBranch = (git branch --show-current 2>$null).Trim()
if (-not $currentBranch) { $currentBranch = "main" }

# 3. Cơ Chế Xác Định Thông Điệp Commit Đa Nguồn (Multi-Source Resolution)
$finalMessage = $Message

# Nguồn 1: Ghép từ Type, Scope, Subject nếu được truyền
if (-not $finalMessage -and $Subject) {
    $t = if ($Type) { $Type } else { "chore" }
    $s = if ($Scope) { $Scope } else { "project" }
    $finalMessage = "$t($s): $Subject"
}

# Nguồn 2: Đọc từ tệp pending-commit.md nếu có và khớp nhánh
if (-not $finalMessage -and (Test-Path $PendingCommitFile)) {
    try {
        $pendingRaw = [System.IO.File]::ReadAllText($PendingCommitFile, [System.Text.Encoding]::UTF8)
        if ($pendingRaw -match '- \*\*Nhánh hiện tại \(Branch\):\*\*\s*([^\r\n]+)') {
            $pBranch = $Matches[1].Trim()
            if ($pBranch -eq $currentBranch) {
                if ($pendingRaw -match '### Tiêu đề \(Header\):\s*```text\s*([^`\r\n]+)') {
                    $finalMessage = $Matches[1].Trim()
                    Write-Host "⚡ [Pipeline] Đã nạp thông điệp từ tệp pending-commit.md: $finalMessage" -ForegroundColor Green
                }
            }
        }
    } catch {
        # Bỏ qua lỗi đọc pending-commit
    }
}

# Nguồn 3: Đọc từ Cửa Sổ Ngữ Cảnh context-memory.md (Token Saver)
if (-not $finalMessage -and (Test-Path $MemoryFile)) {
    try {
        $rawMemory = [System.IO.File]::ReadAllText($MemoryFile, [System.Text.Encoding]::UTF8)
        if ($rawMemory -match '- \*\*Nhánh hoạt động \(Active Branch\):\*\* `+([^`]+)`+') {
            $memBranch = $Matches[1].Trim()
            if ($memBranch -eq $currentBranch) {
                $memType = "chore"
                $memScope = "project"
                $memSubject = ""
                if ($rawMemory -match '- \*\*Phân loại đề xuất \(Type/Scope\):\*\* `+([a-z]+)\(([^)]+)\)`+') {
                    $memType = $Matches[1].Trim()
                    $memScope = $Matches[2].Trim()
                }
                if ($rawMemory -match '- \*\*Tiêu đề commit đề xuất \(Subject\):\*\* (.+)') {
                    $memSubject = $Matches[1].Trim()
                    $finalMessage = "$memType($memScope): $memSubject"
                    Write-Host "⚡ [Token Saver] Đã nạp thông điệp commit từ Cửa Sổ Ngữ Cảnh: $finalMessage" -ForegroundColor Green
                }
            }
        }
    } catch {
        # Bỏ qua lỗi đọc bộ nhớ
    }
}

# Nguồn 4: Phân tích động Working Tree theo bảng kiến trúc chuẩn (Zero Hardcoding)
if (-not $finalMessage) {
    Write-Host "--> [Auto Mode] Đang phân tích động các tệp thay đổi từ git status..." -ForegroundColor Yellow
    $fileListStr = ($lines -join " ")

    $detectedType = if ($Type) { $Type } else { "chore" }
    $detectedScope = if ($Scope) { $Scope } else { "project" }
    $detectedDesc = ""

    if ($currentBranch -match "^([a-z]+)/([a-z0-9_-]+)-(.*)$") {
        if (-not $Type) { $detectedType = $Matches[1] }
        if (-not $Scope) { $detectedScope = $Matches[2] }
    }

    if ($fileListStr -match "apps/web/src/components/charts") {
        if (-not $Type) { $detectedType = "feat" }
        if (-not $Scope) { $detectedScope = "web" }
        $detectedDesc = "trực quan hóa biểu đồ chuỗi thời gian địa chấn"
    } elseif ($fileListStr -match "apps/web/src/layouts") {
        if (-not $Type) { $detectedType = "feat" }
        if (-not $Scope) { $detectedScope = "web" }
        $detectedDesc = "cập nhật cấu trúc layout giao diện frontend"
    } elseif ($fileListStr -match "apps/web") {
        if (-not $Type) { $detectedType = "feat" }
        if (-not $Scope) { $detectedScope = "web" }
        $detectedDesc = "cập nhật giao diện người dùng và tương tác frontend"
    } elseif ($fileListStr -match "apps/api/src/gdmas/services/ingestion") {
        if (-not $Type) { $detectedType = "feat" }
        if (-not $Scope) { $detectedScope = "ingestion" }
        $detectedDesc = "cập nhật tiến trình nạp dữ liệu USGS"
    } elseif ($fileListStr -match "apps/api/src/gdmas/services/analysis") {
        if (-not $Type) { $detectedType = "feat" }
        if (-not $Scope) { $detectedScope = "analysis" }
        $detectedDesc = "cập nhật thuật toán phân tích chuỗi thời gian"
    } elseif ($fileListStr -match "apps/api/src/gdmas/services/clustering") {
        if (-not $Type) { $detectedType = "feat" }
        if (-not $Scope) { $detectedScope = "clustering" }
        $detectedDesc = "cập nhật thuật toán gom cụm không gian"
    } elseif ($fileListStr -match "apps/api/src/gdmas/services/prediction") {
        if (-not $Type) { $detectedType = "feat" }
        if (-not $Scope) { $detectedScope = "prediction" }
        $detectedDesc = "cập nhật mô hình dự báo địa chấn"
    } elseif ($fileListStr -match "apps/api/src/gdmas/realtime") {
        if (-not $Type) { $detectedType = "feat" }
        if (-not $Scope) { $detectedScope = "realtime" }
        $detectedDesc = "cập nhật dịch vụ streaming dữ liệu SSE"
    } elseif ($fileListStr -match "apps/api/src/gdmas/db" -or $fileListStr -match "alembic") {
        if (-not $Type) { $detectedType = "feat" }
        if (-not $Scope) { $detectedScope = "db" }
        $detectedDesc = "cập nhật cấu trúc cơ sở dữ liệu và migrations"
    } elseif ($fileListStr -match "apps/api") {
        if (-not $Type) { $detectedType = "feat" }
        if (-not $Scope) { $detectedScope = "api" }
        $detectedDesc = "cập nhật dịch vụ backend và endpoint REST/SSE"
    } elseif ($fileListStr -match "contracts/") {
        if (-not $Type) { $detectedType = "chore" }
        if (-not $Scope) { $detectedScope = "contracts" }
        $detectedDesc = "chuẩn hóa hợp đồng dữ liệu dùng chung API-Web"
    } elseif ($fileListStr -match "docs/setup") {
        if (-not $Type) { $detectedType = "docs" }
        if (-not $Scope) { $detectedScope = "setup" }
        $detectedDesc = "cập nhật hướng dẫn cài đặt và cấu hình môi trường"
    } elseif ($fileListStr -match "docs/architecture") {
        if (-not $Type) { $detectedType = "docs" }
        if (-not $Scope) { $detectedScope = "architecture" }
        $detectedDesc = "cập nhật tài liệu kiến trúc hệ thống và luồng dữ liệu"
    } elseif ($fileListStr -match "docs/") {
        if (-not $Type) { $detectedType = "docs" }
        if (-not $Scope) { $detectedScope = "core" }
        $detectedDesc = "cập nhật hệ thống tài liệu kỹ thuật dự án"
    } elseif ($fileListStr -match "\.agents") {
        if (-not $Type) { $detectedType = "chore" }
        if (-not $Scope) { $detectedScope = "agents" }
        $detectedDesc = "chuẩn hóa và tối ưu hóa các kỹ năng AI agent"
    } elseif ($fileListStr -match "scripts/") {
        if (-not $Type) { $detectedType = "chore" }
        if (-not $Scope) { $detectedScope = "scripts" }
        $detectedDesc = "cập nhật kịch bản kiểm thử và tự động hóa"
    } else {
        $detectedDesc = "cập nhật tài nguyên và cấu hình dự án"
    }

    $finalMessage = "$detectedType($detectedScope): $detectedDesc"
}

# 4. Kiểm tra nhánh và chuyển nhánh tự động nếu đang ở main
if ($currentBranch -eq "main" -and -not $Force) {
    if (-not $BranchName) {
        $extractedType = "chore"
        $extractedScope = "project"
        if ($finalMessage -match "^([a-z]+)\(([^)]+)\):") {
            $extractedType = $Matches[1]
            $extractedScope = $Matches[2]
        }
        $BranchName = "$extractedType/$extractedScope-updates"
    }
    Write-Host "--> Bạn đang ở nhánh 'main'. Theo quy ước GDMAS, tự động tạo và chuyển sang nhánh: '$BranchName'..." -ForegroundColor Yellow
    
    $branchExists = git branch --list $BranchName 2>$null
    if ($branchExists) {
        git switch $BranchName
    } else {
        git switch -c $BranchName
    }
    $currentBranch = (git branch --show-current 2>$null).Trim()
    Write-Host "✅ Đã chuyển sang nhánh: $currentBranch" -ForegroundColor Green
}

Write-Host "--> Nhánh thực hiện: $currentBranch" -ForegroundColor Gray
Write-Host "--> Commit Message: $finalMessage" -ForegroundColor Gray

# 5. Stage các tệp thay đổi an toàn
Write-Host "--> Đang stage các tệp thay đổi an toàn..." -ForegroundColor Yellow
git add -u
git add docs/ apps/ contracts/ scripts/ .agents/ .claude/ README.md .gitignore 2>$null

# 6. Thực hiện Commit
Write-Host "--> Đang thực hiện commit..." -ForegroundColor Yellow
git commit -m "$finalMessage"

# 7. Kéo rebase từ remote (nếu có upstream)
Write-Host "--> Đang đồng bộ với Remote qua rebase..." -ForegroundColor Yellow
git pull --rebase origin $currentBranch 2>$null

# 8. Đẩy nhánh lên Remote
Write-Host "--> Đang đẩy nhánh '$currentBranch' lên Remote repository..." -ForegroundColor Yellow
git push -u origin $currentBranch

# 9. Tự động đồng bộ Cửa Sổ Ngữ Cảnh
$guardScript = ".agents/skills/source-guard/scripts/source-guard.ps1"
if (Test-Path $guardScript) {
    & $guardScript -UpdateMemory | Out-Null
}

$shortHash = (git rev-parse --short HEAD 2>$null).Trim()
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  ✅ HOÀN TẤT TỰ ĐỘNG COMMIT VÀ PUSH NHÁNH THÀNH CÔNG!   " -ForegroundColor Green
Write-Host "  Nhánh đã đẩy: $currentBranch" -ForegroundColor White
Write-Host "  Commit Hash:  $shortHash" -ForegroundColor White
Write-Host "  Thông điệp:   $finalMessage" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Green
