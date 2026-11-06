#!/usr/bin/env bash
set -e

OUTPUT_FILE="${1:-.agents/notes/changes/source-guard-report.md}"
STRICT_FLAG="$2"

echo "========================================================"
echo "       GDMAS SOURCE CODE INTEGRITY GUARD (OCP)          "
echo "========================================================"

STATUS=$(git status --porcelain)
if [ -z "$STATUS" ]; then
    echo "✅ Working tree sạch sẽ. Không có thay đổi nào cần kiểm tra."
    exit 0
fi

DELETED=$(echo "$STATUS" | grep "^ D" || true)
MODIFIED=$(echo "$STATUS" | grep "^ M" || true)
ADDED=$(echo "$STATUS" | grep -E "^\?\?|^ A" || true)

DELETED_COUNT=$(echo "$DELETED" | grep -c . || true)
MODIFIED_COUNT=$(echo "$MODIFIED" | grep -c . || true)
ADDED_COUNT=$(echo "$ADDED" | grep -c . || true)

echo "--> Tổng số tệp thêm mới:       $ADDED_COUNT"
echo "--> Tổng số tệp chỉnh sửa:      $MODIFIED_COUNT"
echo "--> Tổng số tệp bị xóa:         $DELETED_COUNT"

HAS_VIOLATIONS=false

if [ "$DELETED_COUNT" -gt 0 ]; then
    echo "❌ PHÁT HIỆN VI PHẠM: Có $DELETED_COUNT tệp bị xóa khỏi repository!"
    echo "$DELETED"
    HAS_VIOLATIONS=true
fi

if [ "$HAS_VIOLATIONS" = true ]; then
    echo "Khuyến nghị: Khôi phục lại tệp bị xóa bằng 'git restore <file>'."
    if [ "$STRICT_FLAG" = "--strict" ]; then
        exit 1
    fi
else
    echo "✅ XÁC NHẬN: Không có tệp nào bị xóa. Tuân thủ nguyên tắc Open-Closed!"
fi

