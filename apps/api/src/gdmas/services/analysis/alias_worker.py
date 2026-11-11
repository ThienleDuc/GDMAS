"""Terminal 3 with legacy aliases; replaces, rather than accompanies, worker.py."""

import argparse
import logging

from gdmas.services.analysis.alias_pipeline import AliasCompatiblePipeline
from gdmas.services.analysis.worker import run


def main() -> int:
    parser = argparse.ArgumentParser(
        description="T3: Patterns 1-4 with 1.1 legacy aliases"
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
        AliasCompatiblePipeline(lookback_days=args.lookback_days),
        interval=settings.ANALYSIS_INTERVAL_SECONDS,
        once=args.once,
    )


if __name__ == "__main__":
    raise SystemExit(main())
