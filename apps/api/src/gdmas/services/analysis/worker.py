"""Independent Terminal 3 entrypoint; the original runner remains unchanged."""

import argparse
import logging
import math
import time
from collections.abc import Callable

from gdmas.services.analysis.pipeline import AnalysisPipeline

logger = logging.getLogger(__name__)


def run(
    pipeline: AnalysisPipeline,
    *,
    interval: float = 300,
    once: bool = False,
    clock: Callable[[], float] = time.monotonic,
    sleep: Callable[[float], None] = time.sleep,
) -> int:
    if not math.isfinite(interval) or interval <= 0:
        raise ValueError("Analysis interval must be finite and positive")
    deadline = clock()
    try:
        while True:
            try:
                result = pipeline.execute_cycle()
            except Exception as error:  # noqa: BLE001 -- recover at the worker cycle boundary
                logger.error("Unexpected cycle failure: %s", type(error).__name__)
                result = {"success": False}
            if once:
                return 0 if result["success"] else 1
            deadline += interval
            now = clock()
            if deadline < now:
                deadline += (math.floor((now - deadline) / interval) + 1) * interval
            # Re-check the monotonic clock if a sleep is interrupted early.
            while (remaining := deadline - clock()) > 0:
                sleep(remaining)
    except KeyboardInterrupt:
        logger.info("Analysis worker stopped")
        return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="T3: compute Patterns 1-4 every five minutes"
    )
    parser.add_argument(
        "--once", action="store_true", help="Execute one cycle and exit"
    )
    parser.add_argument("--lookback-days", type=int, default=None)
    args = parser.parse_args()
    if args.lookback_days is not None and args.lookback_days <= 0:
        parser.error("--lookback-days must be positive")
    from gdmas.core.config import settings

    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
    )
    return run(
        AnalysisPipeline(lookback_days=args.lookback_days),
        interval=settings.ANALYSIS_INTERVAL_SECONDS,
        once=args.once,
    )


if __name__ == "__main__":
    raise SystemExit(main())
