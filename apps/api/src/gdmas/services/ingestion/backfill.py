"""Backfill lịch sử MỘT LẦN từ feed USGS `all_month` (bổ sung 2026-11-23).

Worker T2 thường chỉ chạy `all_hour` (theo `settings.USGS_FEED_URL`), nên DB ban đầu
chỉ có vài giờ gần đây — chưa đủ để danh mục quốc gia/khu vực phản ánh bức tranh
toàn cầu. Module này tái dùng `IngestionService` (parse + upsert + log `service_runs`)
với feed tháng, không nhân bản logic và không nhúng vào `main.py` (I1).

Chạy tay:
    cd apps/api && uv run python -m gdmas.services.ingestion.backfill
"""

import json
import logging
from collections.abc import Callable
from typing import Any

import httpx
from sqlalchemy.orm import Session

from gdmas.services.ingestion.service import IngestionService

logger = logging.getLogger("gdmas.services.ingestion.backfill")

MONTH_FEED_URL = (
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson"
)


def run_backfill(
    *,
    feed_url: str = MONTH_FEED_URL,
    session_factory: Callable[[], Session] | None = None,
    http_transport: httpx.BaseTransport | None = None,
) -> dict[str, Any]:
    """Nạp dữ liệu 30 ngày gần nhất; trả cùng shape với `execute_cycle()`."""
    service = IngestionService(
        feed_url,
        session_factory=session_factory,
        http_transport=http_transport,
    )
    result = service.execute_cycle()
    logger.info(
        "[GDMAS-Backfill] feed=%s inserted=%s", feed_url, result.get("inserted")
    )
    return result


def main() -> None:
    """Điểm vào CLI — in kết quả JSON để người thao tác đối chiếu."""
    result = run_backfill()
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
