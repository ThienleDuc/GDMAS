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
    [string[]]$Bullets,

    [Parameter(Mandatory=$false)]
    [switch]$Commit,

    [Parameter(Mandatory=$false)]
    [switch]$Push,

    [Parameter(Mandatory=$false)]
    [string]$OutputFile = ".agents/notes/changes/pending-commit.md",

    [Parameter(Mandatory=$false)]
    [string]$MemoryFile = ".agents/notes/memory/context-memory.md",

    [Parameter(Mandatory=$false)]
    [switch]$ForceScan
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       GDMAS AUTOMATED COMMIT MESSAGE GENERATOR         " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$branch = (git branch --show-current 2>$null).Trim()
if (-not $branch) { $branch = "main" }
$timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss (UTCzzz)")

Write-Host "--> Nhánh hiện tại: $branch" -ForegroundColor Gray
Write-Host "--> Thời điểm quét: $timestamp" -ForegroundColor Gray

$finalType = $Type
$finalScope = $Scope
$finalSubject = $Subject
$finalBullets = New-Object System.Collections.Generic.List[string]
if ($Bullets) { foreach ($b in $Bullets) { $finalBullets.Add($b) } }

$loadedFromMemory = $false
$resolutionSource = ""

# 1. BẬC 1: TRUYỀN THAM SỐ TRỰC TIẾP (Direct Parameters)
if ($Message) {
    if ($Message -match "^([a-z]+)\(([^)]+)\):\s*(.+)$") {
        $finalType = $Matches[1].Trim()
        $finalScope = $Matches[2].Trim()
        $finalSubject = $Matches[3].Trim()
    } else {
        $finalSubject = $Message.Trim()
        if (-not $finalType) { $finalType = "chore" }
        if (-not $finalScope) { $finalScope = "project" }
    }
    $resolutionSource = "Tham số truyền trực tiếp (-Message)"
}

# 2. BẬC 2: ƯU TIÊN ĐỌC CỬA SỔ NGỮ CẢNH (Token Saver Memory)
if (-not $finalSubject -and -not $ForceScan -and (Test-Path $MemoryFile)) {
    try {
        $rawMemory = [System.IO.File]::ReadAllText($MemoryFile, [System.Text.Encoding]::UTF8)
        
        # Kiểm tra xem Context Memory có đang lưu trạng thái của nhánh hiện tại không
        if ($rawMemory -match '- \*\*Nhánh hoạt động \(Active Branch\):\*\* `+([^`]+)`+') {
            $memBranch = $Matches[1].Trim()
            if ($memBranch -eq $branch) {
                if ($rawMemory -match '- \*\*Phân loại đề xuất \(Type/Scope\):\*\* `+([a-z]+)\(([^)]+)\)`+') {
                    $finalType = $Matches[1].Trim()
                    $finalScope = $Matches[2].Trim()
                }
                if ($rawMemory -match '- \*\*Tiêu đề commit đề xuất \(Subject\):\*\* (.+)') {
                    $finalSubject = $Matches[1].Trim()
                }
                if ($rawMemory -match '(?s)- \*\*Tóm tắt thay đổi gần nhất:\*\*(.*?)(?:- \*\*Đánh giá|---|$)') {
                    $bulletBlock = $Matches[1]
                    foreach ($bLine in ($bulletBlock -split "`r?`n")) {
                        $trimmed = $bLine.Trim()
                        if ($trimmed -match '^\*\s*(.+)$') {
                            $finalBullets.Add("- " + $Matches[1].Trim())
                        }
                    }
                }
                if ($finalType -and $finalScope -and $finalSubject) {
                    $loadedFromMemory = $true
                    $resolutionSource = "⚡ Cửa Sổ Ngữ Cảnh Token Saver ($MemoryFile)"
                    Write-Host "⚡ [Token Saver] Đã nạp thông tin phân loại từ Cửa Sổ Ngữ Cảnh cho nhánh: $branch" -ForegroundColor Green
                }
            } else {
                Write-Host "--> [Notice] Cửa sổ ngữ cảnh lưu nhánh '$memBranch', khác nhánh hiện tại '$branch'. Sẽ suy luận động theo working tree." -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "--> [Warning] Lỗi đọc Cửa Sổ Ngữ Cảnh: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# 3. BẬC 3: SUY LUẬN ĐỘNG THEO WORKING TREE (Dynamic Architectural Inference)
$statusOutput = git status --porcelain -uall 2>$null
$lines = @()
if ($statusOutput) {
    $lines = $statusOutput -split "`r?`n" | Where-Object { $_ -match "\S" }
}

if (-not $finalSubject) {
    Write-Host "--> [Dynamic Scan] Phân tích cây thay đổi để suy luận Type, Scope & Subject..." -ForegroundColor Gray
    
    if ($lines.Count -eq 0) {
        Write-Host "ℹ️ Không có thay đổi nào trong working tree (Clean)." -ForegroundColor Green
        exit 0
    }

    $resolutionSource = "🔍 Phân tích động Working Tree (Dynamic Inference)"
    $fileListStr = ($lines -join " ")

    # Trích xuất scope từ nhánh nếu có dạng <type>/<scope>-<desc>
    if ($branch -match "^([a-z]+)/([a-z0-9_-]+)-(.*)$") {
        if (-not $finalType) { $finalType = $Matches[1] }
        if (-not $finalScope) { $finalScope = $Matches[2] }
    }

    # Bảng phân loại kiến trúc chuẩn GDMAS (Không hardcode nội dung tác vụ riêng lẻ)
    if ($fileListStr -match "apps/web/src/components/charts") {
        if (-not $finalType) { $finalType = "feat" }
        if (-not $finalScope) { $finalScope = "web" }
        $finalSubject = "trực quan hóa biểu đồ chuỗi thời gian địa chấn"
    } elseif ($fileListStr -match "apps/web/src/layouts") {
        if (-not $finalType) { $finalType = "feat" }
        if (-not $finalScope) { $finalScope = "web" }
        $finalSubject = "cập nhật cấu trúc layout giao diện frontend"
    } elseif ($fileListStr -match "apps/web") {
        if (-not $finalType) { $finalType = "feat" }
        if (-not $finalScope) { $finalScope = "web" }
        $finalSubject = "cập nhật giao diện người dùng và tương tác frontend"
    } elseif ($fileListStr -match "apps/api/src/gdmas/services/ingestion") {
        if (-not $finalType) { $finalType = "feat" }
        if (-not $finalScope) { $finalScope = "ingestion" }
        $finalSubject = "cập nhật tiến trình nạp dữ liệu USGS"
    } elseif ($fileListStr -match "apps/api/src/gdmas/services/analysis") {
        if (-not $finalType) { $finalType = "feat" }
        if (-not $finalScope) { $finalScope = "analysis" }
        $finalSubject = "cập nhật thuật toán phân tích chuỗi thời gian"
    } elseif ($fileListStr -match "apps/api/src/gdmas/services/clustering") {
        if (-not $finalType) { $finalType = "feat" }
        if (-not $finalScope) { $finalScope = "clustering" }
        $finalSubject = "cập nhật thuật toán gom cụm không gian"
    } elseif ($fileListStr -match "apps/api/src/gdmas/services/prediction") {
        if (-not $finalType) { $finalType = "feat" }
        if (-not $finalScope) { $finalScope = "prediction" }
        $finalSubject = "cập nhật mô hình dự báo địa chấn"
    } elseif ($fileListStr -match "apps/api/src/gdmas/realtime") {
        if (-not $finalType) { $finalType = "feat" }
        if (-not $finalScope) { $finalScope = "realtime" }
        $finalSubject = "cập nhật dịch vụ streaming dữ liệu SSE"
    } elseif ($fileListStr -match "apps/api/src/gdmas/db" -or $fileListStr -match "alembic") {
        if (-not $finalType) { $finalType = "feat" }
        if (-not $finalScope) { $finalScope = "db" }
        $finalSubject = "cập nhật cấu trúc cơ sở dữ liệu và migrations"
    } elseif ($fileListStr -match "apps/api") {
        if (-not $finalType) { $finalType = "feat" }
        if (-not $finalScope) { $finalScope = "api" }
        $finalSubject = "cập nhật dịch vụ backend và endpoint REST/SSE"
    } elseif ($fileListStr -match "contracts/") {
        if (-not $finalType) { $finalType = "chore" }
        if (-not $finalScope) { $finalScope = "contracts" }
        $finalSubject = "chuẩn hóa hợp đồng dữ liệu dùng chung API-Web"
    } elseif ($fileListStr -match "docs/setup") {
        if (-not $finalType) { $finalType = "docs" }
        if (-not $finalScope) { $finalScope = "setup" }
        $finalSubject = "cập nhật hướng dẫn cài đặt và cấu hình môi trường"
    } elseif ($fileListStr -match "docs/architecture") {
        if (-not $finalType) { $finalType = "docs" }
        if (-not $finalScope) { $finalScope = "architecture" }
        $finalSubject = "cập nhật tài liệu kiến trúc hệ thống và luồng dữ liệu"
    } elseif ($fileListStr -match "docs/") {
        if (-not $finalType) { $finalType = "docs" }
        if (-not $finalScope) { $finalScope = "core" }
        $finalSubject = "cập nhật hệ thống tài liệu kỹ thuật dự án"
    } elseif ($fileListStr -match "\.agents") {
        if (-not $finalType) { $finalType = "chore" }
        if (-not $finalScope) { $finalScope = "agents" }
        $finalSubject = "chuẩn hóa và tối ưu hóa các kỹ năng AI agent"
    } elseif ($fileListStr -match "scripts/") {
        if (-not $finalType) { $finalType = "chore" }
        if (-not $finalScope) { $finalScope = "scripts" }
        $finalSubject = "cập nhật kịch bản kiểm thử và tự động hóa"
    } else {
        if (-not $finalType) { $finalType = "chore" }
        if (-not $finalScope) { $finalScope = "project" }
        $finalSubject = "cập nhật tài nguyên và cấu hình dự án"
    }
}

# Đảm bảo có fallback cho Type và Scope
if (-not $finalType) { $finalType = "chore" }
if (-not $finalScope) { $finalScope = "project" }

# Tự động sinh nội dung bullets chi tiết nếu danh sách bullets đang rỗng
if ($finalBullets.Count -eq 0) {
    if ($lines.Count -gt 0) {
        $sampleLines = $lines | Select-Object -First 5
        foreach ($l in $sampleLines) {
            $code = $l.Substring(0, 2).Trim()
            $f = $l.Substring(3).Trim()
            $action = if ($code -eq "A" -or $code -eq "??") { "Thêm mới" } elseif ($code -eq "D") { "Xóa" } else { "Cập nhật" }
            $finalBullets.Add("- $action tệp: $f")
        }
        if ($lines.Count -gt 5) {
            $finalBullets.Add(("- Và {0} tệp khác liên quan..." -f ($lines.Count - 5)))
        }
    } else {
        $finalBullets.Add("- Cập nhật tiến độ phát triển trên nhánh $branch")
    }
}

$commitHeader = "$finalType($finalScope): $finalSubject"
$commitBody = $finalBullets -join [Environment]::NewLine

# 4. Ghi nhận vào tệp nhật ký cục bộ OutputFile (.agents/notes/changes/pending-commit.md)
$doc = New-Object System.Collections.Generic.List[string]
$doc.Add("# [BẢN GHI COMMIT ĐANG CHỜ - PENDING COMMIT RECORD]")
$doc.Add("- **Thời gian tạo:** " + $timestamp)
$doc.Add("- **Nhánh hiện tại (Branch):** " + $branch)
$doc.Add("- **Nguồn xác định:** " + $resolutionSource)
$doc.Add("- **Phân loại (Type):** " + $finalType)
$doc.Add("- **Phạm vi (Scope):** " + $finalScope)
$doc.Add("")
$doc.Add('## 1. Thông Điệp Commit Đề Xuất (Conventional Commit)')
$doc.Add('### Tiêu đề (Header):')
$doc.Add('```text')
$doc.Add($commitHeader)
$doc.Add('```')
$doc.Add('')
$doc.Add('### Nội dung chi tiết (Body tiếng Việt):')
$doc.Add('```text')
$doc.Add($commitBody)
$doc.Add('```')
$doc.Add('')
$doc.Add('## 2. Danh Sách Tệp Tác Động So Với Mã Nguồn Gốc')
$doc.Add('```text')
if ($lines.Count -gt 0) {
    foreach ($sLine in $lines) {
        $doc.Add($sLine)
    }
} else {
    $doc.Add('(Working tree sạch sẽ - Không có tệp thay đổi chưa commit)')
}
$doc.Add('```')
$doc.Add('')
$doc.Add('---')
$doc.Add('*Bản ghi này được sinh tự động bằng tiếng Việt bởi kỹ năng generate-commit và chỉ lưu trữ cục bộ tại .agents/notes/.*')

$targetDir = [System.IO.Path]::GetDirectoryName($OutputFile)
if ($targetDir -and -not (Test-Path $targetDir)) { New-Item -ItemType Directory -Path $targetDir -Force | Out-Null }
$utf8BOM = New-Object System.Text.UTF8Encoding $true
[System.IO.File]::WriteAllLines($OutputFile, $doc, $utf8BOM)

Write-Host ("[+] Đã ghi nhận bản ghi thay đổi vào: " + $OutputFile) -ForegroundColor Green
Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       THÔNG ĐIỆP COMMIT ĐƯỢC TỰ ĐỘNG SINH (TIẾNG VIỆT):" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Header: $commitHeader" -ForegroundColor Yellow
Write-Host "Body:" -ForegroundColor White
Write-Host $commitBody -ForegroundColor Gray
Write-Host "========================================================" -ForegroundColor Cyan

# 5. Tự động commit nếu có switch -Commit
if ($Commit) {
    Write-Host "--> Đang tự động stage và commit..." -ForegroundColor Yellow
    git add -u
    git add docs/ apps/ contracts/ scripts/ .agents/ README.md .gitignore 2>$null
    git commit -m "$commitHeader" -m "$commitBody"
    Write-Host "✅ Đã commit thành công!" -ForegroundColor Green
}

# 6. Tự động push nếu có switch -Push
if ($Push) {
    Write-Host "--> Đang đẩy nhánh '$branch' lên Remote..." -ForegroundColor Yellow
    git push -u origin $branch
    Write-Host "✅ Đã đẩy nhánh lên Remote thành công!" -ForegroundColor Green
}
