[CmdletBinding()]
param (
    [Parameter(Mandatory=$false, Position=0)]
    [string]$BranchName,

    [Parameter(Mandatory=$false)]
    [string]$Type,

    [Parameter(Mandatory=$false)]
    [string]$Scope,

    [Parameter(Mandatory=$false)]
    [string]$Description,

    [Parameter(Mandatory=$false)]
    [string]$BaseBranch,

    [Parameter(Mandatory=$false)]
    [switch]$Push,

    [Parameter(Mandatory=$false)]
    [switch]$SwitchOnly,

    [Parameter(Mandatory=$false)]
    [switch]$Force
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   GDMAS GIT BRANCH SWITCH, CREATE AND PUSH WORKFLOW    " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Kiem tra kho ma nguon Git
$isGit = git rev-parse --is-inside-work-tree 2>$null
if ($LASTEXITCODE -ne 0 -or $isGit -ne "true") {
    Write-Host "[X] Thu muc hien tai khong phai la mot Git repository hop le!" -ForegroundColor Red
    exit 1
}

# 2. Ra soat cay lam viec (Working Tree)
$status = git status --porcelain -uall
$hasChanges = [bool]$status

if ($hasChanges -and -not $Force) {
    Write-Host "[!] Canh bao: Cay lam viec dang co thay doi chua duoc commit:" -ForegroundColor Yellow
    $status | Select-Object -First 5 | ForEach-Object { Write-Host ("    " + $_) -ForegroundColor Gray }
    if (($status | Measure-Object).Count -gt 5) {
        Write-Host "    ... va mot so tep khac." -ForegroundColor Gray
    }
    Write-Host "Khuyen nghi: Hay commit hoac stash cac thay doi truoc khi chuyen nhanh (dung -Force de bo qua)." -ForegroundColor Yellow
}

# 3. Kiem tra Remote Origin
$remoteOrigin = git remote get-url origin 2>$null
if (-not $remoteOrigin) {
    Write-Host "[!] Canh bao: Khong tim thay Remote 'origin'. Che do -Push se khong the thuc thi." -ForegroundColor Yellow
} else {
    Write-Host ("--> Remote Origin: " + $remoteOrigin) -ForegroundColor Gray
}

# 4. Ham chuyen doi Tieng Viet sang Slug
function Convert-ToSlug([string]$text) {
    if (-not $text) { return "task" }
    $text = $text.ToLower().Trim()
    
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

    $stopWords = @("la", "va", "cho", "cua", "tai", "trong", "tu", "cac", "nhung", "mot", "de", "voi", "the", "a", "an", "for", "to", "in", "on", "of", "and", "khi", "do")
    $words = $clean -split "-" | Where-Object { $stopWords -notcontains $_ }

    if ($words.Count -gt 4) {
        $clean = ($words[0..3] -join "-")
    } elseif ($words.Count -gt 0) {
        $clean = ($words -join "-")
    }
    return $clean
}

# 5. Xac dinh Ten Nhanh (Branch Resolution)
if (-not $BranchName) {
    if (-not $Type) { $Type = "feature" }
    if (-not $Scope) { $Scope = "core" }
    $slug = Convert-ToSlug $Description
    if (-not $slug) { $slug = "task-implementation" }
    $BranchName = ("{0}/{1}-{2}" -f $Type, $Scope, $slug)
}

Write-Host ("--> Ten nhanh muc tieu: " + $BranchName) -ForegroundColor White

# 6. Kiem tra ton tai cua nhanh
$localBranchExists = git branch --list $BranchName
$remoteBranchExists = git branch -r --list ("origin/" + $BranchName)

# 7. Xu ly truong hop SwitchOnly
if ($SwitchOnly) {
    if ($localBranchExists) {
        Write-Host ("--> Dang chuyen sang nhanh cuc bo: " + $BranchName) -ForegroundColor Yellow
        git switch $BranchName
    } elseif ($remoteBranchExists) {
        Write-Host ("--> Nhanh da co tren remote. Dang checkout ve cuc bo: " + $BranchName) -ForegroundColor Yellow
        git switch --track ("origin/" + $BranchName)
    } else {
        Write-Host ("[X] Loi: Nhanh '" + $BranchName + "' khong ton tai ca tren cuc bo lan remote origin!") -ForegroundColor Red
        exit 1
    }

    if ($LASTEXITCODE -eq 0) {
        Write-Host "--> Dang dong bo ma nguon moi nhat qua git pull..." -ForegroundColor Yellow
        git pull origin $BranchName 2>$null
        Write-Host ("[V] Da chuyen sang nhanh '" + $BranchName + "' thanh cong!") -ForegroundColor Green
    }
    exit 0
}

# 8. Xu ly tao nhanh moi (Create New Branch)
if ($localBranchExists) {
    Write-Host ("[!] Nhanh '" + $BranchName + "' da ton tai tren may cuc bo.") -ForegroundColor Yellow
    Write-Host "--> Dang tu dong chuyen sang nhanh nay..." -ForegroundColor Yellow
    git switch $BranchName
} else {
    # Xac dinh nhanh co so (Base Branch)
    $currentBranch = (git branch --show-current).Trim()
    
    if (-not $BaseBranch) {
        $developExistsLocally = git branch --list "develop"
        $developExistsRemotely = git branch -r --list "origin/develop"
        if ($developExistsLocally -or $developExistsRemotely) {
            $BaseBranch = "develop"
        } else {
            # Neu develop chua co, uu tien nhanh hien tai neu khong phai main; neu o main thi lay main
            $BaseBranch = $currentBranch
        }
    }

    Write-Host ("--> Nhanh co so duoc chon: " + $BaseBranch) -ForegroundColor Gray

    # Cap nhat nhanh co so neu can thiet
    if ($currentBranch -ne $BaseBranch) {
        Write-Host ("--> Chuyen ve nhanh co so '" + $BaseBranch + "' truoc khi re nhanh...") -ForegroundColor Yellow
        git switch $BaseBranch 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host ("--> Nhanh co so khong the switch truc tiep, tiep tuc re tu nhanh hien tai: " + $currentBranch) -ForegroundColor Gray
            $BaseBranch = $currentBranch
        } else {
            git pull origin $BaseBranch 2>$null
        }
    }

    # Tao va chuyen sang nhanh moi
    Write-Host ("--> Dang tao va chuyen sang nhanh moi: " + $BranchName + "...") -ForegroundColor Yellow
    git switch -c $BranchName
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[X] Loi khi tao nhanh moi bang git switch -c. Thu lai voi git checkout -b..." -ForegroundColor Yellow
        git checkout -b $BranchName
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[X] Khong the tao nhanh moi!" -ForegroundColor Red
            exit 1
        }
    }
    Write-Host ("[V] Da tao va chuyen sang nhanh moi thanh cong: " + $BranchName) -ForegroundColor Green
}

# 9. Thuc hien Push len Remote GitHub neu co co -Push
$pushSuccess = $false
if ($Push) {
    if (-not $remoteOrigin) {
        Write-Host "[!] Khong the push vi chua cau hinh remote origin." -ForegroundColor Yellow
    } else {
        Write-Host ("--> Dang day (push) nhanh '" + $BranchName + "' len GitHub va thiet lap upstream...") -ForegroundColor Yellow
        git push -u origin $BranchName
        if ($LASTEXITCODE -eq 0) {
            $pushSuccess = $true
            Write-Host ("[V] Da day nhanh '" + $BranchName + "' len GitHub thanh cong!") -ForegroundColor Green
        } else {
            Write-Host "[X] Day nhanh len GitHub that bai. Hay kiem tra ket noi mang va quyen truy cap repository." -ForegroundColor Red
        }
    }
}

# 10. Ghi nhat ky bien ban vao .agents/notes/branches/
$timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss (UTCzzz)")
$fileSlug = ($BranchName -replace "[/:]", "-") + ".md"
$logPath = ".agents/notes/branches/" + $fileSlug

$logDir = [System.IO.Path]::GetDirectoryName($logPath)
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

$pushStatusText = if ($pushSuccess) { "Da day len origin voi upstream tracking" } elseif ($Push) { "Day that bai" } else { "Chua day len remote" }
$workingTreeText = if ($hasChanges) { "Co tep chua commit (duoc bao toan)" } else { "Sach se (Clean)" }

$logContent = @"
# [BIEN BAN KHOI TAO & DONG BO NHANH GIT]

- **Thoi diem:** $timestamp
- **Ten nhanh:** ``$BranchName``
- **Nhanh co so (Base):** ``$BaseBranch``
- **Trang thai Push GitHub:** $pushStatusText
- **Cay lam viec truoc khi tao:** $workingTreeText

---

## 1. Huong Dan Thao Tac Tiep Theo

1. **Phat trien ma nguon:** Tuan thu nguyen tac Open-Closed (RULE-03), bo sung tep moi thay vi sua pha vo ma hien co.
2. **Kiem tra an toan:** Chay kiem tra qua source-guard truoc khi commit:
   `powershell .\.agents\skills\source-guard\scripts\source-guard.ps1`
3. **Commit theo chuan:** Soan thong diep tieng Viet qua generate-commit hoac commit-push:
   `powershell .\.agents\skills\git-commit-push\scripts\commit-push.ps1 -Auto`
4. **Day cap nhat len GitHub:**
   `git push origin $BranchName`

---
*Bien ban nay duoc sinh tu dong boi ky nang git-branch-push va duoc luu tru noi bo tai .agents/notes/branches/.*
"@

$utf8BOM = New-Object System.Text.UTF8Encoding $true
[System.IO.File]::WriteAllText($logPath, $logContent, $utf8BOM)
Write-Host ("--> Da ghi bien ban hoat dong vao: " + $logPath) -ForegroundColor Gray

Write-Host "========================================================" -ForegroundColor Green
Write-Host ("  [V] HOAN TAT! Nhanh hien tai: " + (git branch --show-current).Trim()) -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
