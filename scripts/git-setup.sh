#!/usr/bin/env bash
# Kích hoạt Git hooks nội bộ (.githooks/) cho repo GDMAS — chạy idempotent.

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

if [ ! -d ".git" ]; then
    exit 0
fi

for f in .githooks/pre-commit .githooks/commit-msg .githooks/pre-push scripts/git-ship.sh scripts/git-setup.sh; do
    if [ -f "$f" ]; then
        chmod +x "$f" 2>/dev/null || true
    fi
done

current_hooks="$(git config --get core.hooksPath 2>/dev/null || true)"
if [ "$current_hooks" != ".githooks" ]; then
    if ! git config core.hooksPath .githooks 2>/dev/null; then
        echo "[git-setup] Không thể ghi .git/config trong môi trường hiện tại; chạy 'git config core.hooksPath .githooks' trên shell thường để kích hoạt hook." >&2
    fi
fi

if ! command -v python3 >/dev/null 2>&1; then
    echo "[git-setup] Cảnh báo: chưa tìm thấy python3 trong PATH (cần cho scripts/notes_index.py)." >&2
fi
