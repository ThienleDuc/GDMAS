#!/usr/bin/env bash
# ==============================================================================
# GDMAS GIT BRANCH SWITCH, CREATE & PUSH WORKFLOW (BASH SCRIPT)
# ==============================================================================

set -e

BRANCH_NAME=""
TYPE="feature"
SCOPE="core"
DESCRIPTION=""
BASE_BRANCH=""
DO_PUSH=false
SWITCH_ONLY=false
FORCE=false

print_usage() {
    echo "Sử dụng: bash branch-push.sh [tùy chọn]"
    echo ""
    echo "Tùy chọn:"
    echo "  -b <branch>       Tên nhánh đích (vd: refactor/core-missing-scaffold)"
    echo "  -t <type>         Loại tác vụ (feature, bugfix, hotfix, docs, refactor, chore, test)"
    echo "  -s <scope>        Phạm vi module (core, api, web, db, ingestion, analysis, clustering, prediction)"
    echo "  -d <description>  Mô tả ngắn gọn để sinh slug tên nhánh"
    echo "  -B <base_branch>  Nhánh cơ sở để rẽ nhánh (mặc định: develop hoặc nhánh hiện tại)"
    echo "  -p                Đẩy (push) nhánh lên GitHub và gắn upstream tracking"
    echo "  -S                Chỉ chuyển sang nhánh đã có (không tạo mới)"
    echo "  -f                Bỏ qua cảnh báo cây làm việc chưa commit"
    echo "  -h                Hiển thị hướng dẫn này"
}

while getopts "b:t:s:d:B:pSfh" opt; do
    case ${opt} in
        b ) BRANCH_NAME="$OPTARG" ;;
        t ) TYPE="$OPTARG" ;;
        s ) SCOPE="$OPTARG" ;;
        d ) DESCRIPTION="$OPTARG" ;;
        B ) BASE_BRANCH="$OPTARG" ;;
        p ) DO_PUSH=true ;;
        S ) SWITCH_ONLY=true ;;
        f ) FORCE=true ;;
        h ) print_usage; exit 0 ;;
        \? ) print_usage; exit 1 ;;
    esac
done

echo "========================================================"
echo "   GDMAS GIT BRANCH SWITCH, CREATE & PUSH WORKFLOW      "
echo "========================================================"

# 1. Kiểm tra Git repository
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "[X] Lỗi: Thư mục hiện tại không phải là Git repository!"
    exit 1
fi

# 2. Rà soát cây làm việc
STATUS=$(git status --porcelain -uall)
if [ -n "$STATUS" ] && [ "$FORCE" = false ]; then
    echo "[!] Cảnh báo: Cây làm việc có thay đổi chưa commit:"
    echo "$STATUS" | head -n 5
    echo "Khuyến nghị: Commit hoặc stash thay đổi trước khi chuyển nhánh (dùng -f để bỏ qua)."
fi

# 3. Kiểm tra Remote Origin
REMOTE_ORIGIN=$(git remote get-url origin 2>/dev/null || true)
if [ -z "$REMOTE_ORIGIN" ]; then
    echo "[!] Cảnh báo: Không tìm thấy remote 'origin'."
else
    echo "--> Remote Origin: $REMOTE_ORIGIN"
fi

# 4. Sinh tên nhánh nếu chưa truyền trực tiếp
if [ -z "$BRANCH_NAME" ]; then
    if [ -n "$DESCRIPTION" ]; then
        # Chuyển slug đơn giản
        SLUG=$(echo "$DESCRIPTION" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9' '-' | sed 's/-\{2,\}/-/g' | sed 's/^-//;s/-$//')
        # Lấy tối đa 4 từ
        SLUG=$(echo "$SLUG" | cut -d'-' -f1-4)
    else
        SLUG="task-implementation"
    fi
    BRANCH_NAME="${TYPE}/${SCOPE}-${SLUG}"
fi

echo "--> Tên nhánh mục tiêu: $BRANCH_NAME"

LOCAL_EXISTS=$(git branch --list "$BRANCH_NAME")
REMOTE_EXISTS=$(git branch -r --list "origin/$BRANCH_NAME")

# 5. Xử lý Switch-Only
if [ "$SWITCH_ONLY" = true ]; then
    if [ -n "$LOCAL_EXISTS" ]; then
        echo "--> Đang chuyển sang nhánh cục bộ: $BRANCH_NAME"
        git switch "$BRANCH_NAME"
    elif [ -n "$REMOTE_EXISTS" ]; then
        echo "--> Đang checkout nhánh từ remote origin: $BRANCH_NAME"
        git switch --track "origin/$BRANCH_NAME"
    else
        echo "[X] Lỗi: Nhánh '$BRANCH_NAME' không tồn tại trên local hoặc remote!"
        exit 1
    fi
    echo "--> Đang đồng bộ mã nguồn mới nhất..."
    git pull origin "$BRANCH_NAME" 2>/dev/null || true
    echo "[V] Đã chuyển sang nhánh '$BRANCH_NAME' thành công!"
    exit 0
fi

# 6. Xử lý tạo nhánh mới
if [ -n "$LOCAL_EXISTS" ]; then
    echo "[!] Nhánh '$BRANCH_NAME' đã tồn tại trên máy. Đang chuyển sang nhánh này..."
    git switch "$BRANCH_NAME"
else
    CURRENT_BRANCH=$(git branch --show-current)
    if [ -z "$BASE_BRANCH" ]; then
        if git branch --list "develop" >/dev/null 2>&1 || git branch -r --list "origin/develop" >/dev/null 2>&1; then
            BASE_BRANCH="develop"
        else
            BASE_BRANCH="$CURRENT_BRANCH"
        fi
    fi

    echo "--> Nhánh cơ sở: $BASE_BRANCH"

    if [ "$CURRENT_BRANCH" != "$BASE_BRANCH" ]; then
        echo "--> Chuyển về nhánh cơ sở '$BASE_BRANCH' trước khi rẽ nhánh..."
        git switch "$BASE_BRANCH" 2>/dev/null || BASE_BRANCH="$CURRENT_BRANCH"
        git pull origin "$BASE_BRANCH" 2>/dev/null || true
    fi

    echo "--> Đang tạo nhánh mới: $BRANCH_NAME..."
    git switch -c "$BRANCH_NAME" || git checkout -b "$BRANCH_NAME"
    echo "[V] Đã tạo và chuyển sang nhánh mới thành công: $BRANCH_NAME"
fi

# 7. Đẩy lên remote nếu có cờ -p
PUSH_SUCCESS=false
if [ "$DO_PUSH" = true ]; then
    if [ -z "$REMOTE_ORIGIN" ]; then
        echo "[!] Không thể push vì chưa có remote origin."
    else
        echo "--> Đang đẩy nhánh '$BRANCH_NAME' lên GitHub..."
        if git push -u origin "$BRANCH_NAME"; then
            PUSH_SUCCESS=true
            echo "[V] Đã đẩy nhánh '$BRANCH_NAME' lên GitHub thành công!"
        else
            echo "[X] Đẩy nhánh lên GitHub thất bại."
        fi
    fi
fi

# 8. Ghi nhật ký vào .agents/notes/branches/
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
FILE_SLUG=$(echo "$BRANCH_NAME" | tr '/' '-')
LOG_FILE=".agents/notes/branches/${FILE_SLUG}.md"
mkdir -p .agents/notes/branches

cat <<EOF > "$LOG_FILE"
# [BIÊN BẢN KHỞI TẠO & ĐỒNG BỘ NHÁNH GIT]

- **Thời điểm:** $TIMESTAMP
- **Tên nhánh:** \`$BRANCH_NAME\`
- **Nhánh cơ sở (Base):** \`$BASE_BRANCH\`
- **Trạng thái Push GitHub:** $([ "$PUSH_SUCCESS" = true ] && echo "[V] Đã đẩy lên origin với upstream tracking" || echo "Chưa đẩy hoặc thất bại")
- **Cây làm việc:** $([ -n "$STATUS" ] && echo "Có thay đổi dở dang" || echo "Sạch sẽ")

---

## 1. Hướng Dẫn Thao Tác Tiếp Theo
1. Phát triển mã nguồn tuân thủ Open-Closed (RULE-03).
2. Kiểm tra an toàn trước khi commit: \`bash .agents/skills/source-guard/scripts/source-guard.sh\`
3. Commit theo chuẩn: \`bash .agents/skills/git-commit-push/scripts/commit-push.sh\`
4. Đẩy cập nhật lên GitHub: \`git push origin $BRANCH_NAME\`
EOF

echo "--> Đã ghi biên bản hoạt động vào: $LOG_FILE"
echo "========================================================"
echo "  [V] HOÀN TẤT! Nhánh hiện tại: $(git branch --show-current)"
echo "========================================================"

