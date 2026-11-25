"""Entry point chạy độc lập trên Terminal 4 (T4 Clustering).

Lệnh chạy: python -m gdmas.services.clustering.runner
Chu kỳ: 1 ngày/lần. Cờ `--once` chạy ngay 1 chu kỳ (Demo Bước 4–5).
"""

import argparse
import logging
import time
from datetime import UTC, datetime

from gdmas.core.config import settings
from gdmas.db.connection import SessionLocal
from gdmas.services.clustering.service import run_cycle

logger = logging.getLogger("gdmas.services.clustering.runner")

DEFAULT_INTERVAL_SECONDS = 86400


def run_once() -> dict:
    """Chạy một chu kỳ phân cụm với session DB riêng."""
    with SessionLocal() as db:
        return run_cycle(db, now=datetime.now(UTC))


def run(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="GDMAS T4 clustering worker")
    parser.add_argument("--once", action="store_true", help="Chạy 1 chu kỳ rồi thoát")
    # Không đọc sys.argv khi gọi run() từ test/program khác (RULE-03).
    args = parser.parse_args(argv or [])

    if args.once:
        print("[GDMAS-Clustering] Chạy 1 chu kỳ DBSCAN...", flush=True)
        print(run_once(), flush=True)
        return

    print("[GDMAS-Clustering] DBSCAN Clustering Runner initialized.", flush=True)
    while True:
        try:
            run_once()
        except Exception as exc:  # noqa: BLE001 — worker không được crash
            logger.error("[GDMAS-Clustering] Lỗi chu kỳ: %s", exc)
        try:
            # §1.2 docs/yeucaubatbuoc.md: Clustering chạy 1 ngày/lần, chỉnh qua .env.
            interval = getattr(
                settings, "CLUSTERING_INTERVAL_SECONDS", DEFAULT_INTERVAL_SECONDS
            )
            time.sleep(interval)
        except (KeyboardInterrupt, SystemExit):
            print("[GDMAS-Clustering] Service stopping...", flush=True)
            break


if __name__ == "__main__":
    run()
