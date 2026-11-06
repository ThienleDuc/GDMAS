#!/usr/bin/env bash
set -e

OUTPUT_FILE="${1:-.agents/notes/changes/pending-commit.md}"

echo "========================================================"
echo "       GDMAS AUTOMATED COMMIT MESSAGE GENERATOR         "
echo "========================================================"

STATUS=$(git status --porcelain)
if [ -z "$STATUS" ]; then
    echo "ℹ️ Không có thay đổi nào trong working tree (Clean)."
    exit 0
fi

BRANCH=$(git branch --show-current)
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S (%Z)")

echo "--> Nhánh hiện tại: $BRANCH"
echo "--> Thời điểm quét: $TIMESTAMP"

TYPE="chore"
SCOPE="project"
SUBJECT="update project files"
BODY=""

if echo "$STATUS" | grep -E "apps/api" > /dev/null; then
    TYPE="feat"
    SCOPE="api"
    SUBJECT="update api services and endpoints"
    BODY="- Update backend service implementations in apps/api"
elif echo "$STATUS" | grep -E "apps/web" > /dev/null; then
    TYPE="feat"
    SCOPE="web"
    SUBJECT="update web frontend components"
    BODY="- Update user interface and charts in apps/web"
elif echo "$STATUS" | grep "setup\.md" > /dev/null; then
    TYPE="docs"
    SCOPE="setup"
    SUBJECT="update local configuration requirements and setup commands"
    BODY="- Specify local hardware requirements (RAM, CPU, Port 5432/8000/3000)\n- Add automated and manual step-by-step setup guides"
elif echo "$STATUS" | grep -E "architecture|SAD|ERD" > /dev/null; then
    TYPE="docs"
    SCOPE="architecture"
    SUBJECT="update system architecture and data models"
    BODY="- Refine system architecture documents and data diagrams"
elif echo "$STATUS" | grep "docs/" > /dev/null; then
    TYPE="docs"
    SCOPE="core"
    SUBJECT="complete technical documentation and guides"
    BODY="- Update project technical guides and documentation index"
fi

if echo "$STATUS" | grep "\.agents/skills" > /dev/null; then
    BODY="${BODY}\n- Add git automation skills in .agents/skills/"
fi
if echo "$STATUS" | grep "\.agents/notes" > /dev/null; then
    BODY="${BODY}\n- Record project progress and change notes in .agents/notes/"
fi

COMMIT_HEADER="$TYPE($SCOPE): $SUBJECT"

mkdir -p "$(dirname "$OUTPUT_FILE")"
cat << EOF > "$OUTPUT_FILE"
# [PENDING COMMIT RECORD]
- **Thời gian tạo:** $TIMESTAMP
- **Nhánh (Branch):** $BRANCH
- **Phân loại (Type):** $TYPE
- **Phạm vi (Scope):** $SCOPE

## 1. Thông Điệp Commit Đề Xuất (Conventional Commit)
### Header:
\`\`\`text
$COMMIT_HEADER
\`\`\`

### Detailed Body:
\`\`\`text
$(echo -e "$BODY")
\`\`\`

## 2. Danh Sách Tệp Tác Động So Với Mã Nguồn Gốc
\`\`\`text
$STATUS
\`\`\`

---
*Bản ghi này được sinh tự động bởi skill 'generate-commit'.*
EOF

# Đồng bộ sang GDMAS nếu đang ở root
if [[ "$OUTPUT_FILE" == .agents* ]]; then
    mkdir -p "GDMAS/$(dirname "$OUTPUT_FILE")"
    cp "$OUTPUT_FILE" "GDMAS/$OUTPUT_FILE" 2>/dev/null || true
fi

echo "✅ Đã ghi nhận bản ghi thay đổi vào: $OUTPUT_FILE"
echo ""
echo "========================================================"
echo "       THÔNG ĐIỆP COMMIT ĐƯỢC TỰ ĐỘNG SINH:             "
echo "========================================================"
echo "Header: $COMMIT_HEADER"
echo -e "Body:\n$BODY"
echo "========================================================"
