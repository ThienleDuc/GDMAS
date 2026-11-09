"""Entry point chạy độc lập trên Terminal 5 (T5 Prediction).

Lệnh chạy: python -m gdmas.services.prediction.runner
Chu kỳ: 5 phút/lần (PREDICTION_INTERVAL_SECONDS)
"""

import logging
import time
from datetime import datetime, timezone

from gdmas.core.config import settings
from gdmas.services.prediction import inference
from gdmas.services.prediction.service import PredictionService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)


def run() -> None:
    interval = getattr(settings, "PREDICTION_INTERVAL_SECONDS", 300)
    print("==========================================================================", flush=True)
    print("[GDMAS-Prediction] Terminal 5: Quantitative & Classification t+1 Runner", flush=True)
    print(f"[GDMAS-Prediction] Chu kỳ: {interval} giây ({interval // 60} phút / lần)", flush=True)
    print("==========================================================================", flush=True)

    try:
        inference.load_artifacts()  # kiểm tra model có đủ ngay khi khởi động
    except FileNotFoundError as exc:
        print(f"[GDMAS-Prediction] LỖI: {exc}", flush=True)
        return

    service = PredictionService()
    while True:
        try:
            now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
            print(f"\n[GDMAS-Prediction] [{now_str}] Bắt đầu chu kỳ dự báo...", flush=True)
            res = service.execute_cycle()
            if res.get("success"):
                print(
                    f"[GDMAS-Prediction] Ngày {res['target_date']}: dự báo {res['predicted']:.1f} trận "
                    f"[{res['lower']:.1f} - {res['upper']:.1f}] | rủi ro: {res['label']} {res['probabilities']}",
                    flush=True,
                )
            else:
                print(f"[GDMAS-Prediction] Cảnh báo trong chu kỳ: {res.get('error')}", flush=True)
            print(f"[GDMAS-Prediction] Đang chờ {interval} giây cho chu kỳ tiếp theo...\n", flush=True)
            time.sleep(interval)
        except (KeyboardInterrupt, SystemExit):
            print("\n[GDMAS-Prediction] Tiến trình đã nhận lệnh dừng an toàn.", flush=True)
            break


if __name__ == "__main__":
    run()
