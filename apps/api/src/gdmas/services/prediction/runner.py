"""Entry point chạy độc lập trên Terminal 5 (T5 Prediction).

Lệnh chạy: python -m gdmas.services.prediction.runner          (lặp mỗi PREDICTION_INTERVAL_SECONDS, mặc định 5 phút)
           python -m gdmas.services.prediction.runner --once   (chạy ngay 1 chu kỳ rồi thoát — Demo Bước 4–5)
"""

import argparse
import logging
import sys
import time
from datetime import UTC, datetime
from typing import Any

from gdmas.core.config import settings
from gdmas.services.prediction import inference
from gdmas.services.prediction.service import PredictionService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)


def execute_cycle() -> dict[str, Any]:
    """Chạy 1 chu kỳ dự báo, in kết quả ra màn hình và trả về dict kết quả."""
    now_str = datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S UTC")
    print(f"\n[GDMAS-Prediction] [{now_str}] Bắt đầu chu kỳ dự báo...", flush=True)
    res = PredictionService().execute_cycle()
    if res.get("success"):
        print(
            f"[GDMAS-Prediction] Ngày {res['target_date']}: dự báo "
            f"{res['predicted']:.1f} trận [{res['lower']:.1f} - {res['upper']:.1f}] "
            f"| rủi ro: {res['label']} {res['probabilities']}",
            flush=True,
        )
    else:
        print(
            f"[GDMAS-Prediction] Cảnh báo trong chu kỳ: {res.get('error')}", flush=True
        )
    return res


def run() -> None:
    interval = getattr(settings, "PREDICTION_INTERVAL_SECONDS", 300)
    print("=" * 74, flush=True)
    print(
        "[GDMAS-Prediction] Terminal 5: Quantitative & Classification t+1 Runner",
        flush=True,
    )
    print(
        f"[GDMAS-Prediction] Chu kỳ: {interval} giây ({interval // 60} phút / lần)",
        flush=True,
    )
    print("=" * 74, flush=True)

    while True:
        try:
            execute_cycle()
            print(
                f"[GDMAS-Prediction] Đang chờ {interval} giây cho chu kỳ tiếp theo...\n",
                flush=True,
            )
            time.sleep(interval)
        except (KeyboardInterrupt, SystemExit):
            print(
                "\n[GDMAS-Prediction] Tiến trình đã nhận lệnh dừng an toàn.", flush=True
            )
            break


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m gdmas.services.prediction.runner",
        description="Terminal 5 — dự báo số trận (Pattern 5) và phân loại rủi ro (Pattern 6) ngày kế tiếp.",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Chạy ngay 1 chu kỳ dự báo rồi thoát (mã thoát 0 khi thành công, 1 khi thất bại).",
    )
    args = parser.parse_args(argv)

    try:
        inference.load_artifacts()  # kiểm tra model có đủ ngay khi khởi động
    except FileNotFoundError as exc:
        print(f"[GDMAS-Prediction] LỖI: {exc}", flush=True)
        return 1

    if args.once:
        return 0 if execute_cycle().get("success") else 1
    run()
    return 0


if __name__ == "__main__":
    sys.exit(main())
