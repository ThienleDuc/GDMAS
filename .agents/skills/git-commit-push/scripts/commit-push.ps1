[CmdletBinding()]
param (
    [Parameter(Mandatory=$false)]
    [string]$Message,

    [Parameter(Mandatory=$false)]
    [string]$Type,

    [Parameter(Mandatory=$false)]
    [string]$Scope,

    [Parameter(Mandatory=$false)]
    [string]$BranchName,

    [Parameter(Mandatory=$false)]
    [switch]$Auto,

    [Parameter(Mandatory=$false)]
    [switch]$Force
)

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   GDMAS GIT COMMIT & PUSH WORKFLOW (POWERSHELL AUTO)   " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Rà soát trạng thái Git
$status = git status --porcelain -uall
if (-not $status) {
    Write-Host "ℹ️ Không có thay đổi nào cần commit (Working tree clean)." -ForegroundColor Green
    exit 0
}

# 2. Rà soát an toàn tệp .env (tuyệt đối không commit .env)
$stagedEnv = $status | Select-String "^\s*[AM]\s*.*\.env$"
if ($stagedEnv) {
    Write-Host "⚠️ Phát hiện tệp .env trong Staged! Đang tự động gỡ bỏ..." -ForegroundColor Yellow
    git restore --staged .env 2>$null
    git restore --staged apps/web/.env 2>$null
    Write-Host "✅ Đã gỡ .env khỏi Stage an toàn." -ForegroundColor Green
}

# 3. Chế độ Tự Động Phân Tích (Auto-detect Type, Scope & Message)
if ($Auto -or (-not $Message -and -not $Type)) {
    Write-Host "--> [Auto Mode] Đang phân tích các tệp thay đổi để sinh quy ước..." -ForegroundColor Yellow
    
    $fileList = $status | Out-String

    if ($fileList -match "docs/" -or $fileList -match "\.md") {
        $detectedType = "docs"
        if ($fileList -match "setup\.md") {
            $detectedScope = "setup"
            $detectedDesc = "update local configuration requirements and setup commands"
        } elseif ($fileList -match "architecture" -or $fileList -match "SAD" -or $fileList -match "ERD") {
            $detectedScope = "architecture"
            $detectedDesc = "update system architecture and data models"
        } else {
            $detectedScope = "core"
            $detectedDesc = "complete technical documentation and project guides"
        }
    } elseif ($fileList -match "apps/api") {
        $detectedType = "feat"
        $detectedScope = "api"
        $detectedDesc = "update backend service components"
    } elseif ($fileList -match "apps/web") {
        $detectedType = "feat"
        $detectedScope = "web"
        $detectedDesc = "update frontend dashboard components"
    } elseif ($fileList -match "scripts/") {
        $detectedType = "chore"
        $detectedScope = "scripts"
        $detectedDesc = "update project tooling scripts"
    } else {
        $detectedType = "chore"
        $detectedScope = "project"
        $detectedDesc = "update project configuration and assets"
    }

    if (-not $Type) { $Type = $detectedType }
    if (-not $Scope) { $Scope = $detectedScope }
    if (-not $Message) { $Message = "$Type($Scope): $detectedDesc" }
    
    # Sinh tên nhánh tự động nếu đang ở main
    if (-not $BranchName) {
        $BranchName = "$Type/$Scope-updates"
    }
}

# 4. Kiểm tra nhánh và chuyển nhánh tự động nếu đang ở main
$currentBranch = (git branch --show-current).Trim()

if ($currentBranch -eq "main" -and -not $Force) {
    if (-not $BranchName) {
        $BranchName = "$Type/$Scope-updates"
    }
    Write-Host "--> Bạn đang ở nhánh 'main'. Theo quy ước GDMAS, tự động tạo và chuyển sang nhánh: '$BranchName'..." -ForegroundColor Yellow
    
    # Kiểm tra xem nhánh đã tồn tại chưa
    $branchExists = git branch --list $BranchName
    if ($branchExists) {
        git switch $BranchName
    } else {
        git switch -c $BranchName
    }
    $currentBranch = (git branch --show-current).Trim()
    Write-Host "✅ Đã chuyển sang nhánh: $currentBranch" -ForegroundColor Green
}

Write-Host "--> Nhánh thực hiện: $currentBranch" -ForegroundColor Gray
Write-Host "--> Commit Message: $Message" -ForegroundColor Gray

# 5. Stage các tệp thay đổi an toàn
Write-Host "--> Đang stage các tệp thay đổi..." -ForegroundColor Yellow
git add -u
git add docs/ apps/ .agents/ contracts/ scripts/ README.md .gitignore 2>$null

# 6. Thực hiện Commit
Write-Host "--> Đang thực hiện commit..." -ForegroundColor Yellow
git commit -m "$Message"

# 7. Kéo rebase từ remote (nếu có upstream)
Write-Host "--> Đang đồng bộ với Remote qua rebase..." -ForegroundColor Yellow
git pull --rebase origin $currentBranch 2>$null

# 8. Đẩy nhánh lên Remote
Write-Host "--> Đang đẩy nhánh '$currentBranch' lên Remote repository..." -ForegroundColor Yellow
git push -u origin $currentBranch

$shortHash = (git rev-parse --short HEAD).Trim()
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  ✅ HOÀN TẤT TỰ ĐỘNG COMMIT VÀ PUSH NHÁNH THÀNH CÔNG!   " -ForegroundColor Green
Write-Host "  Nhánh đã đẩy: $currentBranch" -ForegroundColor White
Write-Host "  Commit Hash:  $shortHash" -ForegroundColor White
Write-Host "  Thông điệp:   $Message" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Green
