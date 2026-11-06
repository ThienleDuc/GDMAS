"""Entry point chạy độc lập trên Terminal 5 (T5 Prediction).

Lệnh chạy: python -m gdmas.services.prediction.runner
Chu kỳ: 5 phút/lần
"""

import time
import sys


def run() -> None:
    print("[GDMAS-Prediction] Quantitative & Classification t+1 Runner initialized.", flush=True)
    while True:
        try:
            # Placeholder for scheduled prediction cycle
            time.sleep(300)
        except (KeyboardInterrupt, SystemExit):
            print("[GDMAS-Prediction] Service stopping...", flush=True)
            break


if __name__ == "__main__":
    run()
