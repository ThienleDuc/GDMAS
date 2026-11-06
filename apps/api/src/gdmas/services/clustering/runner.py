"""Entry point chạy độc lập trên Terminal 4 (T4 Clustering).

Lệnh chạy: python -m gdmas.services.clustering.runner
Chu kỳ: 1 ngày/lần
"""

import time
import sys


def run() -> None:
    print("[GDMAS-Clustering] DBSCAN/K-Means Clustering Runner initialized.", flush=True)
    while True:
        try:
            # Placeholder for scheduled clustering cycle
            time.sleep(86400)
        except (KeyboardInterrupt, SystemExit):
            print("[GDMAS-Clustering] Service stopping...", flush=True)
            break


if __name__ == "__main__":
    run()
