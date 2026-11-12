"""Cấu hình pytest chung cho apps/api.

Dự án chạy theo src-layout và không cài đặt package (Docker dùng PYTHONPATH=/app/src),
nên thêm `src/` vào sys.path để test import được `gdmas` khi chạy `uv run pytest`.
"""

import sys
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parents[1] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))
