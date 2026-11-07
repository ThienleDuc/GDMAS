#!/usr/bin/env bash
set -e

STRICT_MODE=false
UPDATE_MEMORY=false
OUTPUT_FILE=".agents/notes/changes/source-guard-report.md"
MEMORY_FILE=".agents/notes/memory/context-memory.md"
OVERRIDE_TYPE=""
OVERRIDE_SCOPE=""
OVERRIDE_DESC=""

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --strict|-s) STRICT_MODE=true; shift ;;
        --update-memory|-u) UPDATE_MEMORY=true; shift ;;
        --output|-o) OUTPUT_FILE="$2"; shift 2 ;;
        --memory|-m) MEMORY_FILE="$2"; shift 2 ;;
        --type) OVERRIDE_TYPE="$2"; shift 2 ;;
        --scope) OVERRIDE_SCOPE="$2"; shift 2 ;;
        --desc) OVERRIDE_DESC="$2"; shift 2 ;;
        *) shift ;;
    esac
done

echo "========================================================"
echo "       GDMAS SOURCE CODE INTEGRITY GUARD (OCP)          "
echo "========================================================"

STATUS=$(git status --porcelain -uall 2>/dev/null || true)
BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S (%Z)" 2>/dev/null || date)

DELETED=$(echo "$STATUS" | grep -E "^ D|^D " || true)
MODIFIED=$(echo "$STATUS" | grep -E "^ M|^M " || true)
ADDED=$(echo "$STATUS" | grep -E "^\?\?|^ A|^A " || true)

DELETED_COUNT=$(echo "$DELETED" | grep -c . || true)
MODIFIED_COUNT=$(echo "$MODIFIED" | grep -c . || true)
ADDED_COUNT=$(echo "$ADDED" | grep -c . || true)

echo "--> Nhánh hiện tại:             $BRANCH"
echo "--> Tổng số tệp thêm mới:       $ADDED_COUNT"
echo "--> Tổng số tệp chỉnh sửa:      $MODIFIED_COUNT"
echo "--> Tổng số tệp bị xóa:         $DELETED_COUNT"

HAS_VIOLATIONS=false

if [ "$DELETED_COUNT" -gt 0 ]; then
    echo "❌ PHÁT HIỆN VI PHẠM: Có $DELETED_COUNT tệp bị xóa khỏi repository!"
    echo "$DELETED"
    HAS_VIOLATIONS=true
fi

# Kiểm tra tệp lõi kiến trúc
CORE_PROTECTED=("apps/api/src/gdmas/main.py" "apps/api/src/gdmas/db/connection.py" "apps/api/src/gdmas/db/base.py" "contracts/" "docs/quyuocchung.md")
for pattern in "${CORE_PROTECTED[@]}"; do
    if echo "$MODIFIED" | grep "$pattern" >/dev/null 2>&1; then
        if [ "$STRICT_MODE" = true ]; then
            echo "❌ VI PHẠM TỆP LÕI: Tệp bảo vệ '$pattern' bị chỉnh sửa trong chế độ Strict!"
            HAS_VIOLATIONS=true
        else
            echo "⚠️ CẢNH BÁO TỆP LÕI: Tệp '$pattern' là tệp kiến trúc nhạy cảm đang bị chỉnh sửa."
        fi
    fi
done

if [ "$HAS_VIOLATIONS" = true ]; then
    echo "Khuyến nghị: Khôi phục lại tệp bị xóa bằng 'git restore <file>'."
    if [ "$STRICT_MODE" = true ]; then
        exit 1
    fi
else
    echo "✅ XÁC NHẬN: Không có vi phạm nghiêm trọng. Tuân thủ nguyên tắc Open-Closed!"
fi

# Ghi báo cáo cục bộ
mkdir -p "$(dirname "$OUTPUT_FILE")"
cat << EOF > "$OUTPUT_FILE"
# [BIÊN BẢN KIỂM SOÁT BẢO VỆ MÃ NGUỒN - SOURCE GUARD REPORT]

- **Thời gian quét:** $TIMESTAMP
- **Trạng thái:** $(if [ "$HAS_VIOLATIONS" = true ]; then echo "❌ KHÔNG ĐẠT (VI PHẠM)"; else echo "✅ ĐẠT CHUẨN (HOÀN HẢO)"; fi)
- **Số tệp thêm mới:** $ADDED_COUNT
- **Số tệp chỉnh sửa:** $MODIFIED_COUNT
- **Số tệp bị xóa:** $DELETED_COUNT

---

## 1. Chi Tiết Các Tệp Thay Đổi
### Tệp Bổ Sung Mới:
$(if [ "$ADDED_COUNT" -eq 0 ]; then echo "- (Không có tệp thêm mới)"; else echo "$ADDED" | sed 's/^/- `/; s/$/`/'; fi)

### Tệp Chỉnh Sửa:
$(if [ "$MODIFIED_COUNT" -eq 0 ]; then echo "- (Không có tệp chỉnh sửa)"; else echo "$MODIFIED" | sed 's/^/- `/; s/$/`/'; fi)

### Tệp Bị Xóa:
$(if [ "$DELETED_COUNT" -eq 0 ]; then echo "- (Không có tệp bị xóa - Rất tốt!)"; else echo "$DELETED" | sed 's/^/- `/; s/$/`/'; fi)

---
*Báo cáo này được sinh tự động bởi kỹ năng source-guard và lưu trữ cục bộ tại .agents/notes/changes/.*
EOF

echo "[+] Đã lưu báo cáo thẩm định vào: $OUTPUT_FILE"

# Cập nhật context-memory.md nếu được yêu cầu
if [ "$UPDATE_MEMORY" = true ]; then
    if command -v powershell.exe >/dev/null 2>&1; then
        ARGS=("-File" ".agents/skills/source-guard/scripts/source-guard.ps1" "-UpdateMemory")
        if [ -n "$OVERRIDE_TYPE" ]; then ARGS+=("-Type" "$OVERRIDE_TYPE"); fi
        if [ -n "$OVERRIDE_SCOPE" ]; then ARGS+=("-Scope" "$OVERRIDE_SCOPE"); fi
        if [ -n "$OVERRIDE_DESC" ]; then ARGS+=("-Desc" "$OVERRIDE_DESC"); fi
        powershell.exe -ExecutionPolicy Bypass "${ARGS[@]}"
    else
        echo "--> [Bash Memory Sync] Cập nhật bộ nhớ ngữ cảnh qua Bash..."
    fi
fi
