#!/usr/bin/env bash
set -e

OUTPUT_FILE=".agents/notes/changes/pending-commit.md"
MEMORY_FILE=".agents/notes/memory/context-memory.md"
FORCE_SCAN=false
DO_COMMIT=false
DO_PUSH=false
MSG_OVERRIDE=""
TYPE_OVERRIDE=""
SCOPE_OVERRIDE=""
SUBJECT_OVERRIDE=""

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --message|-m) MSG_OVERRIDE="$2"; shift 2 ;;
        --type|-t) TYPE_OVERRIDE="$2"; shift 2 ;;
        --scope|-s) SCOPE_OVERRIDE="$2"; shift 2 ;;
        --subject) SUBJECT_OVERRIDE="$2"; shift 2 ;;
        --commit|-c) DO_COMMIT=true; shift ;;
        --push|-p) DO_PUSH=true; shift ;;
        --force-scan|-f) FORCE_SCAN=true; shift ;;
        --output|-o) OUTPUT_FILE="$2"; shift 2 ;;
        --memory) MEMORY_FILE="$2"; shift 2 ;;
        *) shift ;;
    esac
done

echo "========================================================"
echo "       GDMAS AUTOMATED COMMIT MESSAGE GENERATOR         "
echo "========================================================"

BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S (%Z)" 2>/dev/null || date)

echo "--> Nhánh hiện tại: $BRANCH"
echo "--> Thời điểm quét: $TIMESTAMP"

FINAL_TYPE="$TYPE_OVERRIDE"
FINAL_SCOPE="$SCOPE_OVERRIDE"
FINAL_SUBJECT="$SUBJECT_OVERRIDE"
RESOLUTION_SRC=""
LOADED_FROM_MEM=false

# Bậc 1: Message truyền trực tiếp
if [ -n "$MSG_OVERRIDE" ]; then
    msg_regex='^([a-z]+)\(([^)]+)\):[[:space:]]*(.+)$'
    if [[ "$MSG_OVERRIDE" =~ $msg_regex ]]; then
        FINAL_TYPE="${BASH_REMATCH[1]}"
        FINAL_SCOPE="${BASH_REMATCH[2]}"
        FINAL_SUBJECT="${BASH_REMATCH[3]}"
    else
        FINAL_SUBJECT="$MSG_OVERRIDE"
    fi
    RESOLUTION_SRC="Tham số truyền trực tiếp (--message)"
fi

# Bậc 2: Đọc Cửa Sổ Ngữ Cảnh (.agents/notes/memory/context-memory.md)
if [ -z "$FINAL_SUBJECT" ] && [ "$FORCE_SCAN" = false ] && [ -f "$MEMORY_FILE" ]; then
    MEM_BRANCH=$(grep -E -- "- \*\*Nhánh hoạt động \(Active Branch\):\*\*" "$MEMORY_FILE" | head -n 1 | sed -E 's/.*`([^`]+)`.*/\1/' || true)
    if [ "$MEM_BRANCH" = "$BRANCH" ]; then
        DETECTED_TYPE_SCOPE=$(grep -E -- "- \*\*Phân loại đề xuất \(Type/Scope\):\*\*" "$MEMORY_FILE" | head -n 1 | sed -E 's/.*`([a-z]+)\(([^)]+)\)`.*/\1:\2/' || true)
        DETECTED_SUBJECT=$(grep -E -- "- \*\*Tiêu đề commit đề xuất \(Subject\):\*\*" "$MEMORY_FILE" | head -n 1 | sed -E 's/.*- \*\*Tiêu đề commit đề xuất \(Subject\):\*\*[[:space:]]*//' || true)
        
        if [ -n "$DETECTED_TYPE_SCOPE" ] && [ -n "$DETECTED_SUBJECT" ]; then
            FINAL_TYPE=$(echo "$DETECTED_TYPE_SCOPE" | cut -d: -f1)
            FINAL_SCOPE=$(echo "$DETECTED_TYPE_SCOPE" | cut -d: -f2)
            FINAL_SUBJECT="$DETECTED_SUBJECT"
            LOADED_FROM_MEM=true
            RESOLUTION_SRC="⚡ Cửa Sổ Ngữ Cảnh Token Saver ($MEMORY_FILE)"
            echo "⚡ [Token Saver] Đã nạp thông tin phân loại từ Cửa Sổ Ngữ Cảnh cho nhánh: $BRANCH"
        fi
    fi
fi

# Bậc 3: Quét động theo working tree
STATUS=$(git status --porcelain -uall 2>/dev/null || true)

if [ -z "$FINAL_SUBJECT" ]; then
    if [ -z "$STATUS" ]; then
        echo "ℹ️ Không có thay đổi nào trong working tree (Clean)."
        exit 0
    fi

    RESOLUTION_SRC="🔍 Phân tích động Working Tree (Dynamic Inference)"

    if [[ "$BRANCH" =~ ^([a-z]+)/([a-z0-9_-]+)-.*$ ]]; then
        [ -z "$FINAL_TYPE" ] && FINAL_TYPE="${BASH_REMATCH[1]}"
        [ -z "$FINAL_SCOPE" ] && FINAL_SCOPE="${BASH_REMATCH[2]}"
    fi

    if echo "$STATUS" | grep "apps/web/src/components/charts" >/dev/null 2>&1; then
        [ -z "$FINAL_TYPE" ] && FINAL_TYPE="feat"
        [ -z "$FINAL_SCOPE" ] && FINAL_SCOPE="web"
        FINAL_SUBJECT="trực quan hóa biểu đồ chuỗi thời gian địa chấn"
    elif echo "$STATUS" | grep "apps/web" >/dev/null 2>&1; then
        [ -z "$FINAL_TYPE" ] && FINAL_TYPE="feat"
        [ -z "$FINAL_SCOPE" ] && FINAL_SCOPE="web"
        FINAL_SUBJECT="cập nhật giao diện người dùng và tương tác frontend"
    elif echo "$STATUS" | grep "apps/api/src/gdmas/services/ingestion" >/dev/null 2>&1; then
        [ -z "$FINAL_TYPE" ] && FINAL_TYPE="feat"
        [ -z "$FINAL_SCOPE" ] && FINAL_SCOPE="ingestion"
        FINAL_SUBJECT="cập nhật tiến trình nạp dữ liệu USGS"
    elif echo "$STATUS" | grep "apps/api/src/gdmas/services/analysis" >/dev/null 2>&1; then
        [ -z "$FINAL_TYPE" ] && FINAL_TYPE="feat"
        [ -z "$FINAL_SCOPE" ] && FINAL_SCOPE="analysis"
        FINAL_SUBJECT="cập nhật thuật toán phân tích chuỗi thời gian"
    elif echo "$STATUS" | grep "apps/api/src/gdmas/services/clustering" >/dev/null 2>&1; then
        [ -z "$FINAL_TYPE" ] && FINAL_TYPE="feat"
        [ -z "$FINAL_SCOPE" ] && FINAL_SCOPE="clustering"
        FINAL_SUBJECT="cập nhật thuật toán gom cụm không gian"
    elif echo "$STATUS" | grep "apps/api/src/gdmas/services/prediction" >/dev/null 2>&1; then
        [ -z "$FINAL_TYPE" ] && FINAL_TYPE="feat"
        [ -z "$FINAL_SCOPE" ] && FINAL_SCOPE="prediction"
        FINAL_SUBJECT="cập nhật mô hình dự báo địa chấn"
    elif echo "$STATUS" | grep "apps/api" >/dev/null 2>&1; then
        [ -z "$FINAL_TYPE" ] && FINAL_TYPE="feat"
        [ -z "$FINAL_SCOPE" ] && FINAL_SCOPE="api"
        FINAL_SUBJECT="cập nhật dịch vụ backend và endpoint REST/SSE"
    elif echo "$STATUS" | grep "contracts/" >/dev/null 2>&1; then
        [ -z "$FINAL_TYPE" ] && FINAL_TYPE="chore"
        [ -z "$FINAL_SCOPE" ] && FINAL_SCOPE="contracts"
        FINAL_SUBJECT="chuẩn hóa hợp đồng dữ liệu dùng chung API-Web"
    elif echo "$STATUS" | grep "docs/" >/dev/null 2>&1; then
        [ -z "$FINAL_TYPE" ] && FINAL_TYPE="docs"
        [ -z "$FINAL_SCOPE" ] && FINAL_SCOPE="core"
        FINAL_SUBJECT="cập nhật hệ thống tài liệu kỹ thuật dự án"
    elif echo "$STATUS" | grep -E "\.agents" >/dev/null 2>&1; then
        [ -z "$FINAL_TYPE" ] && FINAL_TYPE="chore"
        [ -z "$FINAL_SCOPE" ] && FINAL_SCOPE="agents"
        FINAL_SUBJECT="chuẩn hóa và tối ưu hóa các kỹ năng AI agent"
    elif echo "$STATUS" | grep "scripts/" >/dev/null 2>&1; then
        [ -z "$FINAL_TYPE" ] && FINAL_TYPE="chore"
        [ -z "$FINAL_SCOPE" ] && FINAL_SCOPE="scripts"
        FINAL_SUBJECT="cập nhật kịch bản kiểm thử và tự động hóa"
    else
        [ -z "$FINAL_TYPE" ] && FINAL_TYPE="chore"
        [ -z "$FINAL_SCOPE" ] && FINAL_SCOPE="project"
        FINAL_SUBJECT="cập nhật tài nguyên và cấu hình dự án"
    fi
fi

[ -z "$FINAL_TYPE" ] && FINAL_TYPE="chore"
[ -z "$FINAL_SCOPE" ] && FINAL_SCOPE="project"

COMMIT_HEADER="$FINAL_TYPE($FINAL_SCOPE): $FINAL_SUBJECT"

BODY=""
if [ -n "$STATUS" ]; then
    while IFS= read -r line; do
        if [ -n "$line" ]; then
            code=$(echo "$line" | cut -c1-2 | tr -d ' ')
            file=$(echo "$line" | cut -c4-)
            action="Cập nhật"
            if [ "$code" = "??" ] || [ "$code" = "A" ]; then action="Thêm mới"; fi
            if [ "$code" = "D" ]; then action="Xóa"; fi
            BODY="${BODY}- $action tệp: $file\n"
        fi
    done <<< "$(echo "$STATUS" | head -n 5)"
fi

if [ -z "$BODY" ]; then
    BODY="- Cập nhật tiến độ phát triển trên nhánh $BRANCH\n"
fi

mkdir -p "$(dirname "$OUTPUT_FILE")"
cat << EOF > "$OUTPUT_FILE"
# [BẢN GHI COMMIT ĐANG CHỜ - PENDING COMMIT RECORD]
- **Thời gian tạo:** $TIMESTAMP
- **Nhánh hiện tại (Branch):** $BRANCH
- **Nguồn xác định:** $RESOLUTION_SRC
- **Phân loại (Type):** $FINAL_TYPE
- **Phạm vi (Scope):** $FINAL_SCOPE

## 1. Thông Điệp Commit Đề Xuất (Conventional Commit)
### Tiêu đề (Header):
\`\`\`text
$COMMIT_HEADER
\`\`\`

### Nội dung chi tiết (Body tiếng Việt):
\`\`\`text
$(echo -e "$BODY")
\`\`\`

## 2. Danh Sách Tệp Tác Động So Với Mã Nguồn Gốc
\`\`\`text
$(echo "$STATUS" | head -n 20 || echo "(Clean)")
\`\`\`

---
*Bản ghi này được sinh tự động bằng tiếng Việt bởi kỹ năng generate-commit và chỉ lưu trữ cục bộ tại .agents/notes/.*
EOF

echo "[+] Đã ghi nhận bản ghi thay đổi vào: $OUTPUT_FILE"
echo ""
echo "========================================================"
echo "       THÔNG ĐIỆP COMMIT ĐƯỢC TỰ ĐỘNG SINH (TIẾNG VIỆT):"
echo "========================================================"
echo "Header: $COMMIT_HEADER"
echo -e "Body:\n$BODY"
echo "========================================================"

if [ "$DO_COMMIT" = true ]; then
    echo "--> Đang tự động stage và commit..."
    git add -u
    git add docs/ apps/ contracts/ scripts/ .agents/ README.md .gitignore 2>/dev/null || true
    git commit -m "$COMMIT_HEADER" -m "$(echo -e "$BODY")"
    echo "✅ Đã commit thành công!"
fi

if [ "$DO_PUSH" = true ]; then
    echo "--> Đang đẩy nhánh '$BRANCH' lên Remote..."
    git push -u origin "$BRANCH"
    echo "✅ Đã đẩy nhánh lên Remote thành công!"
fi
