#!/usr/bin/env bash
set -e

DESCRIPTION="$1"
TYPE="$2"
SCOPE="$3"
BASE_BRANCH="${4:-develop}"
CREATE_FLAG="$5"

if [ -z "$DESCRIPTION" ]; then
    echo "Sử dụng: bash propose-branch.sh \"<mô tả công việc>\" [type] [scope] [base_branch] [--create]"
    exit 1
fi

echo "========================================================"
echo "       GDMAS GIT BRANCH PROPOSAL GENERATOR              "
echo "========================================================"

# Chuyển mô tả thành slug chữ thường không dấu cơ bản
convert_to_slug() {
    echo "$1" | tr '[:upper:]' '[:lower:]' | sed -e 's/[^a-z0-9]/-/g' -e 's/--*/-/g' -e 's/^-//' -e 's/-$//' | cut -d'-' -f1-4
}

# Tự động nhận diện Type
if [ -z "$TYPE" ]; then
    if echo "$DESCRIPTION" | grep -Ei "hotfix|khẩn cấp|urgent|critical" > /dev/null; then
        TYPE="hotfix"
        [ "$BASE_BRANCH" = "develop" ] && BASE_BRANCH="main"
    elif echo "$DESCRIPTION" | grep -Ei "sửa|fix|bug|lỗi|error|issue" > /dev/null; then
        TYPE="bugfix"
    elif echo "$DESCRIPTION" | grep -Ei "tài liệu|doc|docs|hướng dẫn|guide|readme|setup" > /dev/null; then
        TYPE="docs"
    elif echo "$DESCRIPTION" | grep -Ei "tái cấu trúc|refactor|tối ưu" > /dev/null; then
        TYPE="refactor"
    elif echo "$DESCRIPTION" | grep -Ei "test|kiểm thử|unit test" > /dev/null; then
        TYPE="test"
    elif echo "$DESCRIPTION" | grep -Ei "cấu hình|config|chore|deps" > /dev/null; then
        TYPE="chore"
    else
        TYPE="feature"
    fi
fi

# Tự động nhận diện Scope
if [ -z "$SCOPE" ]; then
    if echo "$DESCRIPTION" | grep -Ei "ingestion|usgs|nạp|crawl|fetch" > /dev/null; then
        SCOPE="ingestion"
    elif echo "$DESCRIPTION" | grep -Ei "analysis|pattern|chuỗi thời gian|trend" > /dev/null; then
        SCOPE="analysis"
    elif echo "$DESCRIPTION" | grep -Ei "clustering|phân cụm|dbscan|kmeans" > /dev/null; then
        SCOPE="clustering"
    elif echo "$DESCRIPTION" | grep -Ei "prediction|dự báo|dự đoán|rủi ro" > /dev/null; then
        SCOPE="prediction"
    elif echo "$DESCRIPTION" | grep -Ei "web|frontend|ui|giao diện|bản đồ|map|leaflet|chart" > /dev/null; then
        SCOPE="web"
    elif echo "$DESCRIPTION" | grep -Ei "api|backend|fastapi|endpoint|sse" > /dev/null; then
        SCOPE="api"
    elif echo "$DESCRIPTION" | grep -Ei "db|database|postgres|sql|alembic" > /dev/null; then
        SCOPE="db"
    elif echo "$DESCRIPTION" | grep -Ei "docker|compose" > /dev/null; then
        SCOPE="docker"
    elif echo "$DESCRIPTION" | grep -Ei "agent|skill" > /dev/null; then
        SCOPE="agents"
    elif echo "$DESCRIPTION" | grep -Ei "script|tự động" > /dev/null; then
        SCOPE="scripts"
    else
        SCOPE="core"
    fi
fi

SLUG=$(convert_to_slug "$DESCRIPTION")
[ -z "$SLUG" ] && SLUG="task-implementation"

BRANCH_NAME="${TYPE}/${SCOPE}-${SLUG}"
BRANCH_SHORT="${TYPE:0:4}/${SCOPE}-${SLUG}"
[ "$TYPE" = "feature" ] && BRANCH_SHORT="feat/${SCOPE}-${SLUG}"
[ "$TYPE" = "bugfix" ] && BRANCH_SHORT="fix/${SCOPE}-${SLUG}"
BRANCH_TICKET="${TYPE}/GDMAS-${SLUG}"

TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S (%Z)")

echo "Mô tả công việc: $DESCRIPTION"
echo "Loại tác vụ:     $TYPE"
echo "Phạm vi:         $SCOPE"
echo "Nhánh cơ sở:     $BASE_BRANCH"
echo ""
echo "========================================================"
echo "   TÊN NHÁNH ĐỀ XUẤT (GDMAS STANDARD):                  "
echo "========================================================"
echo "⭐ Khuyến nghị:   $BRANCH_NAME"
echo "   Dạng ngắn gọn: $BRANCH_SHORT"
echo "   Dạng Ticket:   $BRANCH_TICKET"
echo "========================================================"

OUTPUT_FILE=".agents/notes/branches/$(echo "$BRANCH_NAME" | tr '/' '-')-proposal.md"
mkdir -p "$(dirname "$OUTPUT_FILE")"

cat << EOF > "$OUTPUT_FILE"
# [BẢN ĐỀ XUẤT PHÂN NHÁNH GIT - BRANCH PROPOSAL]

- **Thời gian lập:** $TIMESTAMP
- **Mô tả công việc (Task Description):** $DESCRIPTION
- **Phân loại tác vụ (Type):** \`$TYPE\`
- **Phạm vi tác động (Scope):** \`$SCOPE\`
- **Nhánh cơ sở (Base Branch):** \`$BASE_BRANCH\`

---

## 1. Tên Nhánh Đề Xuất (GDMAS Standard)

### 🌟 Nhánh Đề Xuất Chính Thức (Khuyến nghị):
\`\`\`text
$BRANCH_NAME
\`\`\`

### 🔀 Các Tùy Chọn Đặt Tên Khác:
- **Dạng ngắn gọn:** \`$BRANCH_SHORT\`
- **Dạng theo ticket/task:** \`$BRANCH_TICKET\`

---

## 2. Lệnh Git Khởi Tạo & Thao Tác

\`\`\`bash
# 1. Chuyển về nhánh cơ sở và cập nhật mới nhất
git switch $BASE_BRANCH
git pull origin $BASE_BRANCH

# 2. Tạo và chuyển sang nhánh làm việc mới
git switch -c $BRANCH_NAME

# 3. Đẩy nhánh lên Remote
git push -u origin $BRANCH_NAME
\`\`\`

---
*Bản đề xuất này được sinh tự động bởi kỹ năng propose-branch và chỉ lưu trữ cục bộ tại .agents/notes/branches/.*
EOF

echo "✅ Đã lưu bản đề xuất nhánh vào: $OUTPUT_FILE"

if [ "$CREATE_FLAG" = "--create" ] || [ "$CREATE_FLAG" = "-c" ]; then
    echo "--> Đang tạo và chuyển sang nhánh '$BRANCH_NAME'..."
    git switch -c "$BRANCH_NAME"
    echo "✅ Đã chuyển sang nhánh mới thành công!"
fi

