[CmdletBinding()]
param (
    [Parameter(Mandatory=$true, Position=0)]
    [string]$Description,

    [Parameter(Mandatory=$false)]
    [string]$Type,

    [Parameter(Mandatory=$false)]
    [string]$Scope,

    [Parameter(Mandatory=$false)]
    [string]$BaseBranch = "develop",

    [Parameter(Mandatory=$false)]
    [switch]$Create,

    [Parameter(Mandatory=$false)]
    [string]$OutputFile
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       GDMAS GIT BRANCH PROPOSAL GENERATOR              " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

function Convert-ToSlug([string]$text) {
    if (-not $text) { return "task" }
    $text = $text.ToLower().Trim()
    
    # Loai bo dau tieng Viet
    $normalized = $text.Normalize([System.Text.NormalizationForm]::FormD)
    $sb = New-Object System.Text.StringBuilder
    foreach ($char in $normalized.ToCharArray()) {
        $cat = [System.Globalization.CharUnicodeInfo]::GetUnicodeCategory($char)
        if ($cat -ne [System.Globalization.UnicodeCategory]::NonSpacingMark) {
            [void]$sb.Append($char)
        }
    }
    $clean = $sb.ToString()
    $clean = $clean -replace "đ", "d" -replace "Đ", "d"
    $clean = $clean -replace "[^a-z0-9\s-]", ""
    $clean = $clean -replace "\s+", "-"
    $clean = $clean -replace "-+", "-"
    $clean = $clean.Trim("-")

    # Danh sach stop words can luoc bo de ten ngan gon
    $stopWords = @("la", "va", "cho", "cua", "tai", "trong", "tu", "cac", "nhung", "mot", "de", "voi", "the", "a", "an", "for", "to", "in", "on", "of", "and")
    $words = $clean -split "-" | Where-Object { $stopWords -notcontains $_ }

    if ($words.Count -gt 4) {
        $clean = ($words[0..3] -join "-")
    } elseif ($words.Count -gt 0) {
        $clean = ($words -join "-")
    }

    return $clean
}

$normDesc = Convert-ToSlug $Description

# 1. Tự động nhận diện Loại tác vụ (Type) nếu chưa chỉ định
if (-not $Type) {
    if ($normDesc -match "khan-cap|hotfix|urgent|critical|chay") {
        $Type = "hotfix"
        if ($BaseBranch -eq "develop") { $BaseBranch = "main" }
    } elseif ($normDesc -match "sua|fix|bug|loi|error|issue|fail|crash") {
        $Type = "bugfix"
    } elseif ($normDesc -match "tai-lieu|doc|docs|huong-dan|guide|readme|setup|sad|erd|api-spec") {
        $Type = "docs"
    } elseif ($normDesc -match "tai-cau-truc|refactor|toi-uu|clean|cleanup") {
        $Type = "refactor"
    } elseif ($normDesc -match "test|kiem-thu|unit-test|mock|suite") {
        $Type = "test"
    } elseif ($normDesc -match "cau-hinh|config|chore|deps|thu-vien|docker|ci|cd") {
        $Type = "chore"
    } else {
        $Type = "feature"
    }
}

# 2. Tự động nhận diện Phạm vi (Scope) nếu chưa chỉ định
if (-not $Scope) {
    if ($normDesc -match "ingestion|usgs|nap|crawl|fetch|worker|cao") {
        $Scope = "ingestion"
    } elseif ($normDesc -match "analysis|pattern|chuoi-thoi-gian|temporal|xu-huong|trend|chu-ky") {
        $Scope = "analysis"
    } elseif ($normDesc -match "clustering|phan-cum|dbscan|kmeans|khong-gian|spatial") {
        $Scope = "clustering"
    } elseif ($normDesc -match "prediction|du-bao|du-doan|rui-ro|risk|hoi-quy") {
        $Scope = "prediction"
    } elseif ($normDesc -match "web|frontend|ui|giao-dien|ban-do|map|leaflet|chart|barchart|bieu-do|recharts") {
        $Scope = "web"
    } elseif ($normDesc -match "api|backend|fastapi|endpoint|route|sse|streaming|controller") {
        $Scope = "api"
    } elseif ($normDesc -match "db|database|postgres|sql|alembic|migration|orm|model") {
        $Scope = "db"
    } elseif ($normDesc -match "docker|compose|container") {
        $Scope = "docker"
    } elseif ($normDesc -match "doc|tai-lieu|setup|cai-dat|huong-dan") {
        $Scope = "docs"
    } elseif ($normDesc -match "agent|skill|customization|prompt") {
        $Scope = "agents"
    } elseif ($normDesc -match "script|kich-ban|tu-dong|test-suite") {
        $Scope = "scripts"
    } else {
        $Scope = "core"
    }
}

# 3. Tạo Slug và Tên Nhánh theo chuẩn GDMAS
$slug = $normDesc
if (-not $slug) { $slug = "task-implementation" }

$branchName = "$Type/$Scope-$slug"
$shortType = if ($Type -eq "feature") { "feat" } elseif ($Type -eq "bugfix") { "fix" } else { $Type }
$branchNameShort = "$shortType/$Scope-$slug"
$branchNameTicket = "$Type/GDMAS-$slug"

$timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss (UTCzzz)")

# 4. Sinh danh mục checklist công việc
$checklistItems = @(
    ("- [ ] Phân tích kỹ thuật & xác định các tệp mã nguồn liên quan đến scope '{0}'" -f $Scope),
    "- [ ] Triển khai mã nguồn/tài liệu theo nguyên tắc Open-Closed (Chỉ thêm mới, không phá vỡ mã hiện có)",
    "- [ ] Chạy kiểm thử nội bộ để xác nhận tính ổn định",
    "- [ ] Sinh thông điệp commit bằng tiếng Việt qua skill generate-commit",
    ("- [ ] Mở Pull Request hướng về nhánh '{0}' và gắn reviewer" -f $BaseBranch)
)
$checklistText = $checklistItems -join [Environment]::NewLine

# 5. Xuất nội dung đề xuất ra màn hình
Write-Host "Mô tả công việc: $Description" -ForegroundColor White
Write-Host "Loại tác vụ:     $Type" -ForegroundColor Green
Write-Host "Phạm vi:         $Scope" -ForegroundColor Green
Write-Host "Nhánh cơ sở:     $BaseBranch" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================================" -ForegroundColor Yellow
Write-Host "   TÊN NHÁNH ĐỀ XUẤT (GDMAS STANDARD):                  " -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Yellow
Write-Host "⭐ Khuyến nghị:   $branchName" -ForegroundColor Cyan
Write-Host "   Dạng ngắn gọn: $branchNameShort" -ForegroundColor Gray
Write-Host "   Dạng Ticket:   $branchNameTicket" -ForegroundColor Gray
Write-Host "========================================================" -ForegroundColor Yellow
Write-Host ""

# 6. Ghi bản đề xuất vào thư mục .agents/notes/branches/ (Cục bộ, không lồng .agents)
$branchFileSlug = ($branchName -replace "[/:]", "-") + ".md"
if (-not $OutputFile) {
    $OutputFile = ".agents/notes/branches/$branchFileSlug"
}

$proposalLines = @(
    "# [BẢN ĐỀ XUẤT PHÂN NHÁNH GIT - BRANCH PROPOSAL]",
    "",
    ("- **Thời gian lập:** {0}" -f $timestamp),
    ("- **Mô tả công việc (Task Description):** {0}" -f $Description),
    ("- **Phân loại tác vụ (Type):** ``{0}``" -f $Type),
    ("- **Phạm vi tác động (Scope):** ``{0}``" -f $Scope),
    ("- **Nhánh cơ sở (Base Branch):** ``{0}``" -f $BaseBranch),
    "",
    "---",
    "",
    "## 1. Tên Nhánh Đề Xuất (GDMAS Standard)",
    "",
    "### 🌟 Nhánh Đề Xuất Chính Thức (Khuyến nghị):",
    '```text',
    $branchName,
    '```',
    "",
    "### 🔀 Các Tùy Chọn Đặt Tên Khác:",
    ("- **Dạng ngắn gọn:** ``{0}``" -f $branchNameShort),
    ("- **Dạng theo ticket/task:** ``{0}``" -f $branchNameTicket),
    "",
    "---",
    "",
    "## 2. Kế Hoạch Triển Khai Công Việc (Task Checklist)",
    $checklistText,
    "",
    "---",
    "",
    "## 3. Lệnh Git Khởi Tạo & Thao Tác",
    "",
    '```bash',
    "# 1. Chuyển về nhánh cơ sở và cập nhật mới nhất",
    ("git switch {0}" -f $BaseBranch),
    ("git pull origin {0}" -f $BaseBranch),
    "",
    "# 2. Tạo và chuyển sang nhánh làm việc mới",
    ("git switch -c {0}" -f $branchName),
    "",
    "# 3. Sau khi hoàn thành công việc, stage và commit bằng tiếng Việt",
    "git add <cac-tep-thay-doi>",
    ".\.agents\skills\generate-commit\scripts\generate-commit.ps1 -Commit",
    "",
    "# 4. Đẩy nhánh lên Remote và mở Pull Request vào $BaseBranch",
    ("git push -u origin {0}" -f $branchName),
    '```',
    "",
    "---",
    "*Bản đề xuất này được sinh tự động bởi kỹ năng propose-branch và chỉ lưu trữ cục bộ tại .agents/notes/branches/.*"
)

$targetDir = [System.IO.Path]::GetDirectoryName($OutputFile)
if ($targetDir -and -not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

$content = $proposalLines -join [Environment]::NewLine
$utf8BOM = New-Object System.Text.UTF8Encoding $true
[System.IO.File]::WriteAllText($OutputFile, $content, $utf8BOM)
Write-Host "[+] Đã lưu bản đề xuất nhánh vào: $OutputFile" -ForegroundColor Green

# 7. Tự động chuyển nhánh nếu có tham số -Create
if ($Create) {
    Write-Host "--> Đang tự động tạo và chuyển sang nhánh '$branchName'..." -ForegroundColor Yellow
    
    $baseExists = git branch --list $BaseBranch
    if ($baseExists) {
        git switch $BaseBranch 2>$null
    }
    
    git switch -c $branchName
    Write-Host "✅ Đã chuyển sang nhánh mới thành công: $branchName" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Lệnh tạo nhánh thủ công:" -ForegroundColor Cyan
    Write-Host "  git switch -c $branchName" -ForegroundColor White
}
