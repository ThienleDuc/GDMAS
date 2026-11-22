#!/usr/bin/env bash
# GDMAS smoke test offline — dùng sau khi setup (docs/setup.md §5.3).
# Không khởi động Docker, không gọi mạng; dừng ngay với exit code != 0 nếu có bước fail.

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

echo "==> [1/3] Kiểm tra nhất quán notes..."
python3 scripts/notes_index.py --check

echo "==> [2/3] Chạy toàn bộ test Backend (offline)..."
(cd apps/api && uv run pytest -q)

echo "==> [3/3] Chạy toàn bộ test Frontend (offline)..."
(cd apps/web && pnpm test)

echo "HOÀN TẤT: notes + Backend + Frontend đều đạt."
