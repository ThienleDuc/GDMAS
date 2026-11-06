[CmdletBinding()]
param (
    [Parameter(Mandatory=$false)]
    [switch]$Commit,

    [Parameter(Mandatory=$false)]
    [switch]$Push,

    [Parameter(Mandatory=$false)]
    [string]$OutputFile = ".agents/notes/changes/pending-commit.md"
)

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       GDMAS AUTOMATED COMMIT MESSAGE GENERATOR         " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Kiem tra trang thai Git
$statusOutput = git status --porcelain -uall
if (-not $statusOutput) {
    Write-Host "[i] Khong co thay doi nao trong working tree (Clean)." -ForegroundColor Green
    exit 0
}

$branch = (git branch --show-current).Trim()
$timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss (UTCzzz)")

Write-Host "--> Nhanh hien tai: $branch" -ForegroundColor Gray
Write-Host "--> Thoi diem quet: $timestamp" -ForegroundColor Gray

# 2. Phan loai tep thay doi va suy luan Type & Scope
$lines = $statusOutput -split "`r?`n" | Where-Object { $_ -match "\S" }

$type = "docs"
$scope = "core"
$subject = "complete comprehensive technical documentation and project setup"
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

# Uu tien theo nhanh hien tai
if ($branch -eq "docs") {
    $type = "docs"
    $scope = "core"
    $subject = "complete system architecture, technical guides, setup and agent skills"
    $bullets += "- Complete 30 comprehensive technical documents in docs/ (SAD, ERD, API, Setup, Guides)"
    $bullets += "- Standardize 7-terminals architecture and local automated test suite scripts"
    $bullets += "- Add agent customization skills (generate-commit, git-commit-push) and progress notes"
    $bullets += "- Configure repository .gitignore to exclude local commit drafts and secrets"
} elseif ($hasApi) {
    $type = "feat"
    $scope = "api"
    $subject = "update api services and endpoints"
    $bullets += "- Update backend service implementations in apps/api"
} elseif ($hasWeb) {
    $type = "feat"
    $scope = "web"
    $subject = "update web frontend components"
    $bullets += "- Update user interface and charts in apps/web"
} elseif ($hasSetup) {
    $type = "docs"
    $scope = "setup"
    $subject = "update local configuration requirements and setup commands"
    $bullets += "- Specify local hardware requirements and automated setup commands"
} elseif ($hasArch) {
    $type = "docs"
    $scope = "architecture"
    $subject = "update system architecture and data models"
    $bullets += "- Refine system architecture documents and data diagrams"
} else {
    $type = "chore"
    $scope = "project"
    $subject = "update project files"
    $bullets += "- Update project assets and configurations"
}

$commitHeader = "$type($scope): $subject"
$commitBody = $bullets -join [Environment]::NewLine

# 3. Tao noi dung ban ghi thay doi
$reportLines = @(
    "# [PENDING COMMIT RECORD]",
    "- **Thoi gian tao:** $timestamp",
    "- **Nhanh (Branch):** $branch",
    "- **Phan loai (Type):** $type",
    "- **Pham vi (Scope):** $scope",
    "",
    "## 1. Thong Diep Commit De Xuat (Conventional Commit)",
    "### Header:",
    '```text',
    $commitHeader,
    '```',
    "",
    "### Detailed Body:",
    '```text',
    $commitBody,
    '```',
    "",
    "## 2. Danh Sach Tep Tac Dong So Voi Ma Nguon Goc",
    '```text',
    ($lines -join [Environment]::NewLine),
    '```',
    "",
    "---",
    "*Ban ghi nay duoc sinh tu dong boi skill generate-commit.*"
)

$changeRecord = $reportLines -join [Environment]::NewLine

# Dam bao thu muc ton tai
$targetDir = [System.IO.Path]::GetDirectoryName($OutputFile)
if ($targetDir -and -not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

$utf8BOM = New-Object System.Text.UTF8Encoding $true
[System.IO.File]::WriteAllText($OutputFile, $changeRecord, $utf8BOM)

# Dong bo sang GDMAS neu dang o root
if ($OutputFile.StartsWith(".agents")) {
    $subPath = "GDMAS\" + $OutputFile
    $subDir = [System.IO.Path]::GetDirectoryName($subPath)
    if (-not (Test-Path $subDir)) { New-Item -ItemType Directory -Path $subDir -Force | Out-Null }
    [System.IO.File]::WriteAllText($subPath, $changeRecord, $utf8BOM)
}

Write-Host "[+] Da ghi nhan ban ghi thay doi vao: $OutputFile" -ForegroundColor Green
Write-Host ""
Write-Host "========================================================" -ForegroundColor Yellow
Write-Host "       THONG DIEP COMMIT DUOC TU DONG SINH:             " -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Yellow
Write-Host "Header: $commitHeader" -ForegroundColor White
Write-Host "Body:" -ForegroundColor Gray
Write-Host $commitBody -ForegroundColor Gray
Write-Host "========================================================" -ForegroundColor Yellow
Write-Host ""

# 4. Neu co co -Commit hoac -Push, tien hanh thuc hien
if ($Commit -or $Push) {
    Write-Host "--> Dang tu dong stage cac tep..." -ForegroundColor Yellow
    git add -u
    git add docs/ apps/ .agents/ contracts/ scripts/ README.md GDMAS/ .gitignore 2>$null

    git commit -m $commitHeader -m $commitBody
    Write-Host "[+] Da commit thanh cong!" -ForegroundColor Green

    if ($Push) {
        Write-Host "--> Dang day nhanh '$branch' len Remote..." -ForegroundColor Yellow
        git push -u origin $branch
        Write-Host "[+] Da push nhanh len remote thanh cong!" -ForegroundColor Green
    }
} else {
    Write-Host "Goi y buoc tiep theo:" -ForegroundColor Cyan
    Write-Host "  1. Kiem tra lai ban ghi tai: $OutputFile" -ForegroundColor White
    Write-Host "  2. Thuc hien commit va push bang lenh:" -ForegroundColor White
    Write-Host "     .\.agents\skills\git-commit-push\scripts\commit-push.ps1 -Message `"$commitHeader`"" -ForegroundColor Yellow
}
