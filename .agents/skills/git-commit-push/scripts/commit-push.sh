#!/usr/bin/env bash
set -e

MSG_OVERRIDE=""
TYPE_OVERRIDE=""
SCOPE_OVERRIDE=""
SUBJECT_OVERRIDE=""
BRANCH_OVERRIDE=""
FORCE=false
MEMORY_FILE=".agents/notes/memory/context-memory.md"
PENDING_FILE=".agents/notes/changes/pending-commit.md"

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --message|-m) MSG_OVERRIDE="$2"; shift 2 ;;
        --type|-t) TYPE_OVERRIDE="$2"; shift 2 ;;
        --scope|-s) SCOPE_OVERRIDE="$2"; shift 2 ;;
        --subject) SUBJECT_OVERRIDE="$2"; shift 2 ;;
        --branch|-b) BRANCH_OVERRIDE="$2"; shift 2 ;;
        --force|-f) FORCE=true; shift ;;
        *)
            if [ -z "$MSG_OVERRIDE" ] && [[ "$1" != -* ]]; then
                MSG_OVERRIDE="$1"
            fi
            shift ;;
    esac
done

echo "========================================================"
echo "    GDMAS GIT COMMIT & PUSH WORKFLOW (BASH AUTO)        "
echo "========================================================"

CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")

# 1. Rà soát trạng thái Git
STATUS=$(git status --porcelain -uall 2>/dev/null || true)
if [ -z "$STATUS" ]; then
    echo "ℹ️ Không có thay đổi nào cần commit (Working tree clean)."
    exit 0
fi

# 2. Rà soát an toàn tệp .env
if echo "$STATUS" | grep -E "^\s*[AM\?]{1,2}\s+.*\.env($|\.)" | grep -v "\.env\.example" >/dev/null 2>&1; then
    echo "⚠️ Phát hiện tệp .env trong Staged/Working tree! Đang bảo vệ và loại trừ..."
    git restore --staged .env 2>/dev/null || true
    git restore --staged apps/web/.env 2>/dev/null || true
    git restore --staged apps/api/.env 2>/dev/null || true
    echo "✅ Đã gỡ .env khỏi Stage an toàn."
fi

FINAL_MSG="$MSG_OVERRIDE"

# Nguồn 1: Ghép từ Type, Scope, Subject
if [ -z "$FINAL_MSG" ] && [ -n "$SUBJECT_OVERRIDE" ]; then
    t="${TYPE_OVERRIDE:-chore}"
    s="${SCOPE_OVERRIDE:-project}"
    FINAL_MSG="$t($s): $SUBJECT_OVERRIDE"
fi

# Nguồn 2: Đọc từ pending-commit.md
if [ -z "$FINAL_MSG" ] && [ -f "$PENDING_FILE" ]; then
    P_BRANCH=$(grep -E -- "- \*\*Nhánh hiện tại \(Branch\):\*\*" "$PENDING_FILE" | head -n 1 | sed -E 's/.*`*([^`\r\n]+)`*/\1/' || true)
    if [ "$P_BRANCH" = "$CURRENT_BRANCH" ]; then
        DETECTED_HEADER=$(grep -A 2 "### Tiêu đề (Header):" "$PENDING_FILE" | grep -v "###" | grep -v '```' | head -n 1 | tr -d '\r\n' || true)
        if [ -n "$DETECTED_HEADER" ]; then
            FINAL_MSG="$DETECTED_HEADER"
            echo "⚡ [Pipeline] Đã nạp thông điệp từ tệp pending-commit.md: $FINAL_MSG"
        fi
    fi
fi

# Nguồn 3: Đọc từ Cửa Sổ Ngữ Cảnh (.agents/notes/memory/context-memory.md)
if [ -z "$FINAL_MSG" ] && [ -f "$MEMORY_FILE" ]; then
    MEM_BRANCH=$(grep -E -- "- \*\*Nhánh hoạt động \(Active Branch\):\*\*" "$MEMORY_FILE" | head -n 1 | sed -E 's/.*`([^`]+)`.*/\1/' || true)
    if [ "$MEM_BRANCH" = "$CURRENT_BRANCH" ]; then
        DETECTED_TYPE_SCOPE=$(grep -E -- "- \*\*Phân loại đề xuất \(Type/Scope\):\*\*" "$MEMORY_FILE" | head -n 1 | sed -E 's/.*`([a-z]+)\(([^)]+)\)`.*/\1:\2/' || true)
        DETECTED_SUBJECT=$(grep -E -- "- \*\*Tiêu đề commit đề xuất \(Subject\):\*\*" "$MEMORY_FILE" | head -n 1 | sed -E 's/.*- \*\*Tiêu đề commit đề xuất \(Subject\):\*\*[[:space:]]*//' || true)
        if [ -n "$DETECTED_TYPE_SCOPE" ] && [ -n "$DETECTED_SUBJECT" ]; then
            t=$(echo "$DETECTED_TYPE_SCOPE" | cut -d: -f1)
            s=$(echo "$DETECTED_TYPE_SCOPE" | cut -d: -f2)
            FINAL_MSG="$t($s): $DETECTED_SUBJECT"
            echo "⚡ [Token Saver] Đã nạp thông điệp commit từ Cửa Sổ Ngữ Cảnh: $FINAL_MSG"
        fi
    fi
fi

# Nguồn 4: Suy luận động từ Working Tree
if [ -z "$FINAL_MSG" ]; then
    echo "--> [Auto Mode] Đang phân tích động các tệp thay đổi từ git status..."
    t="${TYPE_OVERRIDE:-chore}"
    s="${SCOPE_OVERRIDE:-project}"
    d="cập nhật tài nguyên và cấu hình dự án"

    if [[ "$CURRENT_BRANCH" =~ ^([a-z]+)/([a-z0-9_-]+)-.*$ ]]; then
        [ -z "$TYPE_OVERRIDE" ] && t="${BASH_REMATCH[1]}"
        [ -z "$SCOPE_OVERRIDE" ] && s="${BASH_REMATCH[2]}"
    fi

    if echo "$STATUS" | grep "apps/web/src/components/charts" >/dev/null 2>&1; then
        [ -z "$TYPE_OVERRIDE" ] && t="feat"
        [ -z "$SCOPE_OVERRIDE" ] && s="web"
        d="trực quan hóa biểu đồ chuỗi thời gian địa chấn"
    elif echo "$STATUS" | grep "apps/web" >/dev/null 2>&1; then
        [ -z "$TYPE_OVERRIDE" ] && t="feat"
        [ -z "$SCOPE_OVERRIDE" ] && s="web"
        d="cập nhật giao diện người dùng và tương tác frontend"
    elif echo "$STATUS" | grep "apps/api/src/gdmas/services/ingestion" >/dev/null 2>&1; then
        [ -z "$TYPE_OVERRIDE" ] && t="feat"
        [ -z "$SCOPE_OVERRIDE" ] && s="ingestion"
        d="cập nhật tiến trình nạp dữ liệu USGS"
    elif echo "$STATUS" | grep "apps/api/src/gdmas/services/analysis" >/dev/null 2>&1; then
        [ -z "$TYPE_OVERRIDE" ] && t="feat"
        [ -z "$SCOPE_OVERRIDE" ] && s="analysis"
        d="cập nhật thuật toán phân tích chuỗi thời gian"
    elif echo "$STATUS" | grep "apps/api/src/gdmas/services/clustering" >/dev/null 2>&1; then
        [ -z "$TYPE_OVERRIDE" ] && t="feat"
        [ -z "$SCOPE_OVERRIDE" ] && s="clustering"
        d="cập nhật thuật toán gom cụm không gian"
    elif echo "$STATUS" | grep "apps/api/src/gdmas/services/prediction" >/dev/null 2>&1; then
        [ -z "$TYPE_OVERRIDE" ] && t="feat"
        [ -z "$SCOPE_OVERRIDE" ] && s="prediction"
        d="cập nhật mô hình dự báo địa chấn"
    elif echo "$STATUS" | grep "apps/api" >/dev/null 2>&1; then
        [ -z "$TYPE_OVERRIDE" ] && t="feat"
        [ -z "$SCOPE_OVERRIDE" ] && s="api"
        d="cập nhật dịch vụ backend và endpoint REST/SSE"
    elif echo "$STATUS" | grep "contracts/" >/dev/null 2>&1; then
        [ -z "$TYPE_OVERRIDE" ] && t="chore"
        [ -z "$SCOPE_OVERRIDE" ] && s="contracts"
        d="chuẩn hóa hợp đồng dữ liệu dùng chung API-Web"
    elif echo "$STATUS" | grep "docs/" >/dev/null 2>&1; then
        [ -z "$TYPE_OVERRIDE" ] && t="docs"
        [ -z "$SCOPE_OVERRIDE" ] && s="core"
        d="cập nhật hệ thống tài liệu kỹ thuật dự án"
    elif echo "$STATUS" | grep -E "\.agents" >/dev/null 2>&1; then
        [ -z "$TYPE_OVERRIDE" ] && t="chore"
        [ -z "$SCOPE_OVERRIDE" ] && s="agents"
        d="chuẩn hóa và tối ưu hóa các kỹ năng AI agent"
    elif echo "$STATUS" | grep "scripts/" >/dev/null 2>&1; then
        [ -z "$TYPE_OVERRIDE" ] && t="chore"
        [ -z "$SCOPE_OVERRIDE" ] && s="scripts"
        d="cập nhật kịch bản kiểm thử và tự động hóa"
    fi

    FINAL_MSG="$t($s): $d"
fi

# 4. Kiểm tra nhánh và chuyển nhánh tự động nếu đang ở main
if [ "$CURRENT_BRANCH" = "main" ] && [ "$FORCE" = false ]; then
    if [ -z "$BRANCH_OVERRIDE" ]; then
        BRANCH_OVERRIDE="chore/project-updates"
    fi
    echo "--> Bạn đang ở nhánh 'main'. Tự động tạo và chuyển sang nhánh: '$BRANCH_OVERRIDE'..."
    git switch "$BRANCH_OVERRIDE" 2>/dev/null || git switch -c "$BRANCH_OVERRIDE"
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "$BRANCH_OVERRIDE")
    echo "✅ Đã chuyển sang nhánh: $CURRENT_BRANCH"
fi

echo "--> Nhánh thực hiện: $CURRENT_BRANCH"
echo "--> Commit Message: $FINAL_MSG"

# 5. Stage các tệp thay đổi
echo "--> Đang stage các tệp thay đổi an toàn..."
git add -u
git add docs/ apps/ contracts/ scripts/ .agents/ README.md .gitignore 2>/dev/null || true

# 6. Commit
echo "--> Đang thực hiện commit..."
git commit -m "$FINAL_MSG"

# 7. Kéo rebase
echo "--> Đang đồng bộ với Remote qua rebase..."
git pull --rebase origin "$CURRENT_BRANCH" 2>/dev/null || true

# 8. Push
echo "--> Đang đẩy nhánh '$CURRENT_BRANCH' lên Remote repository..."
git push -u origin "$CURRENT_BRANCH"

SHORT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "HEAD")
echo "========================================================"
echo "  ✅ HOÀN TẤT TỰ ĐỘNG COMMIT VÀ PUSH NHÁNH THÀNH CÔNG!   "
echo "  Nhánh đã đẩy: $CURRENT_BRANCH"
echo "  Commit Hash:  $SHORT_HASH"
echo "  Thông điệp:   $FINAL_MSG"
echo "========================================================"
