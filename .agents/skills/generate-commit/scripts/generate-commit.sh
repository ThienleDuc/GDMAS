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
SUBJECT="cập nhật tệp nguồn và cấu hình dự án"
BODY=""

if echo "$STATUS" | grep -E "apps/api" > /dev/null; then
    TYPE="feat"
    SCOPE="api"
    SUBJECT="cập nhật dịch vụ backend và endpoint api"
    BODY="- Cập nhật mã nguồn và luồng xử lý dữ liệu backend trong apps/api"
elif echo "$STATUS" | grep -E "apps/web" > /dev/null; then
    TYPE="feat"
    SCOPE="web"
    SUBJECT="cập nhật giao diện người dùng và thành phần bản đồ"
    BODY="- Cập nhật giao diện người dùng, bản đồ và biểu đồ trực quan trong apps/web"
elif echo "$STATUS" | grep "setup\.md" > /dev/null; then
    TYPE="docs"
    SCOPE="setup"
    SUBJECT="cập nhật yêu cầu cấu hình môi trường và lệnh cài đặt"
    BODY="- Quy định thông số phần cứng khuyến nghị (RAM, CPU, Port)\n- Bổ sung tài liệu hướng dẫn thiết lập hệ thống"
elif echo "$STATUS" | grep -E "architecture|SAD|ERD" > /dev/null; then
    TYPE="docs"
    SCOPE="architecture"
    SUBJECT="cập nhật tài liệu kiến trúc và mô hình dữ liệu"
    BODY="- Tinh chỉnh tài liệu thiết kế hệ thống và sơ đồ thực thể liên kết"
elif echo "$STATUS" | grep "docs/" > /dev/null; then
    TYPE="docs"
    SCOPE="core"
    SUBJECT="hoàn thiện tài liệu kỹ thuật toàn diện cho hệ thống"
    BODY="- Cập nhật hệ thống tài liệu và hướng dẫn kỹ thuật"
fi

if echo "$STATUS" | grep "\.agents/skills" > /dev/null; then
    BODY="${BODY}\n- Cải tiến và bổ sung các kỹ năng AI agent trong .agents/skills/"
fi
if echo "$STATUS" | grep "\.agents/notes" > /dev/null; then
    BODY="${BODY}\n- Ghi nhận nhật ký tiến độ cục bộ trong .agents/notes/"
fi

COMMIT_HEADER="$TYPE($SCOPE): $SUBJECT"

mkdir -p "$(dirname "$OUTPUT_FILE")"
cat << EOF > "$OUTPUT_FILE"
# [BẢN GHI COMMIT ĐANG CHỜ - PENDING COMMIT RECORD]
- **Thời gian tạo:** $TIMESTAMP
- **Nhánh hiện tại (Branch):** $BRANCH
- **Phân loại (Type):** $TYPE
- **Phạm vi (Scope):** $SCOPE

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
$STATUS
\`\`\`

---
*Bản ghi này được sinh tự động bằng tiếng Việt bởi kỹ năng 'generate-commit' và chỉ lưu trữ cục bộ tại .agents/notes/.*
EOF

echo "✅ Đã ghi nhận bản ghi thay đổi vào: $OUTPUT_FILE"
echo ""
echo "========================================================"
echo "       THÔNG ĐIỆP COMMIT ĐƯỢC TỰ ĐỘNG SINH (TIẾNG VIỆT):"
echo "========================================================"
echo "Header: $COMMIT_HEADER"
echo -e "Body:\n$BODY"
echo "========================================================"
