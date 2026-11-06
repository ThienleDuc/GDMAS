[CmdletBinding()]
param (
    [Parameter(Mandatory=$false)]
    [switch]$Commit,

    [Parameter(Mandatory=$false)]
    [switch]$Push,

    [Parameter(Mandatory=$false)]
    [string]$OutputFile = ".agents/notes/changes/pending-commit.md"
)

# Thiet lap ma hoa UTF-8 cho console va file
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       GDMAS AUTOMATED COMMIT MESSAGE GENERATOR         " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Kiem tra trang thai Git
$statusOutput = git status --porcelain -uall
if (-not $statusOutput) {
    Write-Host "[i] Không có thay đổi nào trong working tree (Clean)." -ForegroundColor Green
    exit 0
}

$branch = (git branch --show-current).Trim()
$timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss (UTCzzz)")

Write-Host "--> Nhánh hiện tại: $branch" -ForegroundColor Gray
Write-Host "--> Thời điểm quét: $timestamp" -ForegroundColor Gray

# 2. Phan loai tep thay doi va suy luan Type & Scope bang tieng Viet
$lines = $statusOutput -split "`r?`n" | Where-Object { $_ -match "\S" }

$type = "docs"
$scope = "core"
$subject = "hoàn thiện hệ thống tài liệu kỹ thuật và cấu hình dự án"
$bullets = @()

$hasDocs = $false
$hasSetup = $false
$hasArch = $false
$hasApi = $false
$hasWeb = $false
$hasNotes = $false
$hasSkills = $false
$hasScripts = $false

foreach ($line in $lines) {
    if ($line -match "setup\.md") { $hasSetup = $true; $hasDocs = $true }
    elseif ($line -match "architecture" -or $line -match "SAD" -or $line -match "ERD") { $hasArch = $true; $hasDocs = $true }
    elseif ($line -match "docs/") { $hasDocs = $true }
    elseif ($line -match "apps/api") { $hasApi = $true }
    elseif ($line -match "apps/web") { $hasWeb = $true }
    elseif ($line -match "\.agents/notes") { $hasNotes = $true }
    elseif ($line -match "\.agents/skills") { $hasSkills = $true }
    elseif ($line -match "scripts/") { $hasScripts = $true }
}

# Uu tien theo nhanh hien tai va vung ma nguon thay doi
if ($branch -eq "docs") {
    $type = "docs"
    $scope = "core"
    $subject = "hoàn thiện hệ thống tài liệu kiến trúc, hướng dẫn kỹ thuật và kỹ năng agent"
    $bullets += "- Hoàn thiện tài liệu kỹ thuật toàn diện trong docs/ (SAD, ERD, API, Hướng dẫn cài đặt)"
    $bullets += "- Chuẩn hóa mô hình kiến trúc 7 terminals và bộ kịch bản kiểm thử tự động cục bộ"
    $bullets += "- Bổ sung và cập nhật các kỹ năng AI trong .agents/skills/ cùng sổ tay tiến độ"
    $bullets += "- Cấu hình .gitignore bảo vệ thông tin mật và chỉ lưu trữ cục bộ các bản ghi tạm"
} elseif ($hasApi) {
    $type = "feat"
    $scope = "api"
    $subject = "cập nhật dịch vụ backend và các endpoint xử lý dữ liệu"
    $bullets += "- Cập nhật mã nguồn và luồng xử lý dữ liệu backend trong apps/api"
} elseif ($hasWeb) {
    $type = "feat"
    $scope = "web"
    $subject = "cập nhật giao diện người dùng và trực quan hóa bản đồ"
    $bullets += "- Cập nhật thành phần giao diện, bản đồ địa chấn và biểu đồ phân tích trong apps/web"
} elseif ($hasSetup) {
    $type = "docs"
    $scope = "setup"
    $subject = "cập nhật yêu cầu cấu hình môi trường và kịch bản thiết lập"
    $bullets += "- Quy định cấu hình phần cứng tối thiểu và các lệnh thiết lập tự động hóa"
} elseif ($hasArch) {
    $type = "docs"
    $scope = "architecture"
    $subject = "cập nhật kiến trúc hệ thống và mô hình thực thể dữ liệu"
    $bullets += "- Tinh chỉnh tài liệu thiết kế kiến trúc hệ thống và sơ đồ thực thể ERD"
} elseif ($hasSkills) {
    $type = "chore"
    $scope = "agents"
    $subject = "chuẩn hóa các kỹ năng AI agent và quy chuẩn phân nhánh"
    $bullets += "- Cải tiến kỹ năng sinh commit tiếng Việt và đề xuất phân nhánh git theo tác vụ"
} else {
    $type = "chore"
    $scope = "project"
    $subject = "cập nhật cấu hình và tệp nguồn dự án"
    $bullets += "- Cập nhật tài nguyên và cấu hình hệ thống"
}

$commitHeader = "$type($scope): $subject"
$commitBody = $bullets -join [Environment]::NewLine

# 3. Tao noi dung ban ghi thay doi bang tieng Viet
$reportLines = @(
    "# [BẢN GHI COMMIT ĐANG CHỜ - PENDING COMMIT RECORD]",
    "- **Thời gian tạo:** $timestamp",
    "- **Nhánh hiện tại (Branch):** $branch",
    "- **Phân loại (Type):** $type",
    "- **Phạm vi (Scope):** $scope",
    "",
    "## 1. Thông Điệp Commit Đề Xuất (Conventional Commit)",
    "### Tiêu đề (Header):",
    '```text',
    $commitHeader,
    '```',
    "",
    "### Nội dung chi tiết (Body tiếng Việt):",
    '```text',
    $commitBody,
    '```',
    "",
    "## 2. Danh Sách Tệp Tác Động So Với Mã Nguồn Gốc",
    '```text',
    ($lines -join [Environment]::NewLine),
    '```',
    "",
    "---",
    "*Bản ghi này được sinh tự động bằng tiếng Việt bởi kỹ năng generate-commit và chỉ lưu trữ cục bộ tại .agents/notes/.*"
)

$changeRecord = $reportLines -join [Environment]::NewLine

# Dam bao thu muc ton tai trong .agents/notes
$targetDir = [System.IO.Path]::GetDirectoryName($OutputFile)
if ($targetDir -and -not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

$utf8Encoding = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($OutputFile, $changeRecord, $utf8Encoding)

Write-Host "[+] Đã ghi nhận bản ghi thay đổi vào: $OutputFile" -ForegroundColor Green
Write-Host ""
Write-Host "========================================================" -ForegroundColor Yellow
Write-Host "       THÔNG ĐIỆP COMMIT ĐƯỢC TỰ ĐỘNG SINH (TIẾNG VIỆT):" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Yellow
Write-Host "Header: $commitHeader" -ForegroundColor White
Write-Host "Body:" -ForegroundColor Gray
Write-Host $commitBody -ForegroundColor Gray
Write-Host "========================================================" -ForegroundColor Yellow
Write-Host ""

# 4. Neu co co -Commit hoac -Push, tien hanh thuc hien
if ($Commit -or $Push) {
    Write-Host "--> Đang tự động stage các tệp..." -ForegroundColor Yellow
    git add -u
    git add docs/ apps/ .agents/ contracts/ scripts/ README.md .gitignore 2>$null

    git commit -m $commitHeader -m $commitBody
    Write-Host "[+] Đã commit thành công với thông điệp tiếng Việt!" -ForegroundColor Green

    if ($Push) {
        Write-Host "--> Đang đẩy nhánh '$branch' lên Remote..." -ForegroundColor Yellow
        git push -u origin $branch
        Write-Host "[+] Đã push nhánh lên remote thành công!" -ForegroundColor Green
    }
} else {
    Write-Host "Gợi ý bước tiếp theo:" -ForegroundColor Cyan
    Write-Host "  1. Kiểm tra lại bản ghi tại: $OutputFile" -ForegroundColor White
    Write-Host "  2. Thực hiện commit và push bằng lệnh:" -ForegroundColor White
    Write-Host "     .\.agents\skills\git-commit-push\scripts\commit-push.ps1 -Message `"$commitHeader`"" -ForegroundColor Yellow
}
