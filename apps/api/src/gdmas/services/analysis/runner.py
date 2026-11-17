"""Entry point chạy độc lập trên Terminal 3 (T3 Analysis).

Lệnh chạy: python -m gdmas.services.analysis.runner          (lặp mỗi ANALYSIS_INTERVAL_SECONDS, mặc định 5 phút)
           python -m gdmas.services.analysis.runner --once   (chạy ngay 1 chu kỳ rồi thoát — Demo Bước 4–5)
"""

import argparse
import logging
import sys
import time
from datetime import UTC, datetime
from typing import Any

from gdmas.core.config import settings
from gdmas.services.analysis.service import AnalysisService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

DEFAULT_INTERVAL_SECONDS = 300


def execute_cycle() -> dict[str, Any]:
    """Chạy đúng 1 chu kỳ phân tích Pattern 1–4 và in kết quả."""
    now_str = datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S UTC")
    print(
        f"\n[GDMAS-Analysis] [{now_str}] Bắt đầu chu kỳ phân tích Pattern 1–4...",
        flush=True,
    )
    result = AnalysisService().execute_cycle()
    if result.get("success"):
        print(
            f"[GDMAS-Analysis] Thành công ({result.get('duration_seconds', 0):.2f}s): "
            f"{result.get('events_analyzed', 0)} sự kiện → {result.get('results_written', 0)} bản ghi analysis_results.",
            flush=True,
        )
    else:
        print(
            f"[GDMAS-Analysis] Chu kỳ thất bại: {result.get('error', 'Không rõ nguyên nhân')}",
            flush=True,
        )
    return result


def run(interval: int | None = None) -> None:
    interval = interval or getattr(
        settings, "ANALYSIS_INTERVAL_SECONDS", DEFAULT_INTERVAL_SECONDS
    )
    print(
        "==========================================================================",
        flush=True,
    )
    print(
        "[GDMAS-Analysis] Terminal 3: Time-Series Analysis (Pattern 1–4) Active",
        flush=True,
    )
    print(f"[GDMAS-Analysis] Chu kỳ phân tích tự động: {interval} giây", flush=True)
    print(
        "==========================================================================",
        flush=True,
    )
    while True:
        try:
            execute_cycle()
            print(
                f"[GDMAS-Analysis] Đang chờ {interval} giây cho chu kỳ tiếp theo...",
                flush=True,
            )
            time.sleep(interval)
        except (KeyboardInterrupt, SystemExit):
            print("[GDMAS-Analysis] Service stopping...", flush=True)
            break
        except Exception as exc:  # noqa: BLE001 — worker không được crash, thử lại ở chu kỳ sau
            print(
                f"[GDMAS-Analysis] Ngoại lệ không mong muốn: {exc}. Thử lại sau {interval} giây...",
                flush=True,
            )
            time.sleep(interval)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m gdmas.services.analysis.runner",
        description="Terminal 3 — phân tích 4 Patterns chuỗi thời gian (Temporal, Trend, Seasonality, Correlation).",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Chạy ngay 1 chu kỳ phân tích rồi thoát (mã thoát 0 khi thành công, 1 khi thất bại).",
    )
    args = parser.parse_args(argv)
    if args.once:
        return 0 if execute_cycle().get("success") else 1
    run()
    return 0


if __name__ == "__main__":
    sys.exit(main())
