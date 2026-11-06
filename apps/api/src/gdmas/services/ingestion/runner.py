"""Entry point chạy độc lập trên Terminal 2 (T2 Ingestion).

Lệnh chạy: python -m gdmas.services.ingestion.runner
Chu kỳ: 5 phút/lần
"""

import time
import sys


def run() -> None:
    print("[GDMAS-Ingestion] Service runner initialized (Cycle: 5 mins).", flush=True)
    while True:
        try:
            # Placeholder for scheduled USGS ingestion cycle
            time.sleep(300)
        except (KeyboardInterrupt, SystemExit):
            print("[GDMAS-Ingestion] Service stopping...", flush=True)
            break


if __name__ == "__main__":
    run()
