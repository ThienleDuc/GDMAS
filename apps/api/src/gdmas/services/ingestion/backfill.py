"""Backfill lịch sử MỘT LẦN từ USGS FDSN (bổ sung 2026-11-23, cập nhật 1 năm).

Worker T2 thường chỉ chạy `all_hour`, nên DB ban đầu quá hẹp. USGS **không có**
feed summary `all_year`; module này dùng FDSN `?starttime=&endtime=` chia theo từng
cửa sổ ~30 ngày cho tới `settings.DATA_WINDOW_DAYS` (mặc định 30 = 1 tháng).
Mỗi query có `limit=20000` nên cần chia nhỏ. Tái dùng parse/upsert của T2, không
nhân bản logic, không nhúng vào `main.py` (I1).

Chạy tay:
    cd apps/api && uv run python -m gdmas.services.ingestion.backfill
"""

import json
import logging
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import urlencode

import httpx
from sqlalchemy.orm import Session

from gdmas.core.config import settings
from gdmas.models.service_run import ServiceRun
from gdmas.services.ingestion.parser import parse_features
from gdmas.services.ingestion.upsert import UpsertStats, upsert_events

logger = logging.getLogger("gdmas.services.ingestion.backfill")

CHUNK_DAYS = 30
FDSN_RESULT_LIMIT = 20000
REQUEST_TIMEOUT = 30.0


def build_query_url(
    start: datetime, end: datetime, min_magnitude: float, base_url: str | None = None
) -> str:
    """URL FDSN cho một cửa sổ thời gian UTC — limit 20k nên chia từng tháng."""
    params = {
        "format": "geojson",
        "starttime": start.date().isoformat(),
        "endtime": end.date().isoformat(),
        "minmagnitude": min_magnitude,
        "limit": FDSN_RESULT_LIMIT,
        "orderby": "time",
    }
    return f"{base_url or settings.BACKFILL_QUERY_URL}?{urlencode(params)}"


def build_windows(now: datetime, days: int) -> list[tuple[datetime, datetime]]:
    """Chia cửa sổ `days` thành các đoạn CHUNK_DAYS ngày."""
    windows: list[tuple[datetime, datetime]] = []
    cursor = now - timedelta(days=days)
    while cursor < now:
        end = min(cursor + timedelta(days=CHUNK_DAYS), now)
        windows.append((cursor, end))
        cursor = end
    return windows


def run_backfill(
    *,
    feed_url: str | None = None,
    session_factory: Callable[[], Session] | None = None,
    http_transport: httpx.BaseTransport | None = None,
    now: datetime | None = None,
    days: int | None = None,
    min_magnitude: float | None = None,
) -> dict[str, Any]:
    """Nạp dữ liệu `days` ngày gần nhất (mặc định 1 năm); trả thống kê tổng hợp."""
    now = now or datetime.now(UTC)
    window_days = days if days is not None else settings.DATA_WINDOW_DAYS
    min_mag = (
        min_magnitude if min_magnitude is not None else settings.BACKFILL_MIN_MAGNITUDE
    )
    urls = (
        [feed_url]
        if feed_url
        else [
            build_query_url(start, end, min_mag)
            for start, end in build_windows(now, window_days)
        ]
    )

    from gdmas.db.connection import SessionLocal

    factory = session_factory or SessionLocal
    totals = {"inserted": 0, "updated": 0, "unchanged": 0, "skipped_invalid": 0}
    with factory() as db:
        run = ServiceRun(
            service_name="backfill",
            started_at=now,
            status="RUNNING",
            records_processed=0,
        )
        db.add(run)
        db.commit()
        db.refresh(run)

        try:
            with httpx.Client(
                timeout=REQUEST_TIMEOUT, transport=http_transport
            ) as client:
                for url in urls:
                    response = client.get(url)
                    response.raise_for_status()
                    features = response.json().get("features", [])
                    rows, skipped = parse_features(features)
                    stats: UpsertStats = upsert_events(db, rows)
                    db.commit()
                    totals["inserted"] += stats.inserted
                    totals["updated"] += stats.updated
                    totals["unchanged"] += stats.unchanged
                    totals["skipped_invalid"] += skipped
                    logger.info("[GDMAS-Backfill] %s → +%s", url[:96], stats.inserted)

            run.status = "SUCCESS"
            run.records_processed = totals["inserted"] + totals["updated"]
            run.finished_at = datetime.now(UTC)
            db.commit()
        except Exception as exc:  # noqa: BLE001 — CLI không crash, ghi lỗi vào ServiceRun
            db.rollback()
            run.status = "FAILED"
            run.error_message = f"{type(exc).__name__}: {exc}"[:200]
            run.finished_at = datetime.now(UTC)
            db.commit()
            logger.error("[GDMAS-Backfill] Thất bại: %s", run.error_message)
            return {"success": False, "error": "BACKFILL_FAILED"}

    return {
        "success": True,
        "days": window_days,
        "windows": len(urls),
        "inserted": totals["inserted"],
        "updated": totals["updated"],
        "unchanged": totals["unchanged"],
        "skipped_invalid": totals["skipped_invalid"],
        "total_in_db": None,
    }


def main() -> None:
    """Điểm vào CLI — in kết quả JSON để người thao tác đối chiếu."""
    result = run_backfill()
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
