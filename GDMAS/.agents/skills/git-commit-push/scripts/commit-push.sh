#!/usr/bin/env bash
set -e

COMMIT_MSG="$1"
BRANCH_NAME="$2"

echo "========================================================"
echo "    GDMAS GIT COMMIT & PUSH WORKFLOW (BASH AUTO)        "
echo "========================================================"

# 1. Rà soát trạng thái Git
STATUS=$(git status --porcelain)
if [ -z "$STATUS" ]; then
    echo "ℹ️ Không có thay đổi nào cần commit (Working tree clean)."
    exit 0
fi

# 2. Rà soát an toàn tệp .env
if echo "$STATUS" | grep -E "^\s*[AM]\s*.*\.env$" > /dev/null; then
    echo "⚠️ Phát hiện tệp .env trong Staged! Đang tự động gỡ bỏ..."
    git restore --staged .env 2>/dev/null || true
    git restore --staged GDMAS/.env 2>/dev/null || true
    git restore --staged GDMAS/apps/web/.env 2>/dev/null || true
    echo "✅ Đã gỡ .env khỏi Stage an toàn."
fi

# 3. Tự động nhận diện nếu không có commit message
if [ -z "$COMMIT_MSG" ]; then
    echo "--> [Auto Mode] Đang phân tích thay đổi để sinh quy ước..."
    if echo "$STATUS" | grep -E "docs/|\.md" > /dev/null; then
        TYPE="docs"
        if echo "$STATUS" | grep "setup\.md" > /dev/null; then
            SCOPE="setup"
            DESC="update local configuration requirements and setup commands"
        elif echo "$STATUS" | grep -E "architecture|SAD|ERD" > /dev/null; then
            SCOPE="architecture"
            DESC="update system architecture and data models"
        else
            SCOPE="core"
            DESC="complete technical documentation and project guides"
        fi
    elif echo "$STATUS" | grep "apps/api" > /dev/null; then
        TYPE="feat"
        SCOPE="api"
        DESC="update backend service components"
    elif echo "$STATUS" | grep "apps/web" > /dev/null; then
        TYPE="feat"
        SCOPE="web"
        DESC="update frontend dashboard components"
    else
        TYPE="chore"
        SCOPE="project"
        DESC="update project configuration and assets"
    fi

    COMMIT_MSG="$TYPE($SCOPE): $DESC"
    if [ -z "$BRANCH_NAME" ]; then
        BRANCH_NAME="$TYPE/$SCOPE-updates"
    fi
fi

# 4. Kiểm tra nhánh và chuyển nhánh tự động nếu đang ở main
CURRENT_BRANCH=$(git branch --show-current)

if [ "$CURRENT_BRANCH" = "main" ]; then
    if [ -z "$BRANCH_NAME" ]; then
        BRANCH_NAME="docs/core-updates"
    fi
    echo "--> Bạn đang ở nhánh 'main'. Tự động tạo và chuyển sang nhánh: '$BRANCH_NAME'..."
    git switch "$BRANCH_NAME" 2>/dev/null || git switch -c "$BRANCH_NAME"
    CURRENT_BRANCH=$(git branch --show-current)
    echo "✅ Đã chuyển sang nhánh: $CURRENT_BRANCH"
fi

echo "--> Nhánh thực hiện: $CURRENT_BRANCH"
echo "--> Commit Message: $COMMIT_MSG"

# 5. Stage các tệp thay đổi
echo "--> Đang stage các tệp thay đổi..."
git add -u
git add docs/ apps/ .agents/ contracts/ scripts/ README.md GDMAS/ 2>/dev/null || true

# 6. Commit
echo "--> Đang thực hiện commit..."
git commit -m "$COMMIT_MSG"

# 7. Kéo rebase
echo "--> Đang đồng bộ với Remote qua rebase..."
git pull --rebase origin "$CURRENT_BRANCH" 2>/dev/null || true

# 8. Push
echo "--> Đang đẩy nhánh '$CURRENT_BRANCH' lên Remote repository..."
git push -u origin "$CURRENT_BRANCH"

SHORT_HASH=$(git rev-parse --short HEAD)
echo "========================================================"
echo "  ✅ HOÀN TẤT TỰ ĐỘNG COMMIT VÀ PUSH NHÁNH THÀNH CÔNG!   "
echo "  Nhánh đã đẩy: $CURRENT_BRANCH"
echo "  Commit Hash:  $SHORT_HASH"
echo "  Thông điệp:   $COMMIT_MSG"
echo "========================================================"
