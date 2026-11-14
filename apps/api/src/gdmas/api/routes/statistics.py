import logging
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from gdmas.api.errors import error_response
from gdmas.db.connection import get_db
from gdmas.models.earthquake import EarthquakeEvent
from gdmas.schemas.earthquake import (
    EarthquakeStatistics,
    HourlyTimeSeriesPoint,
    StatisticsResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/statistics", tags=["Statistics"])

BUCKET_HOURS = 3
BUCKET_COUNT = 8  # 8 khoảng x 3 giờ = 24 giờ gần nhất


def _time_series_24h(db: Session, now_utc: datetime) -> list[HourlyTimeSeriesPoint]:
    """Chuỗi 8 khoảng 3 giờ trong 24 giờ gần nhất, tính từ dữ liệu thật (UTC)."""
    start = now_utc - timedelta(hours=BUCKET_HOURS * BUCKET_COUNT)
    bucket_seconds = BUCKET_HOURS * 3600
    bucket = func.floor(
        (func.extract("epoch", EarthquakeEvent.event_time) - start.timestamp())
        / bucket_seconds
    ).label("bucket")
    rows = (
        db.query(
            bucket,
            func.count(EarthquakeEvent.id),
            func.avg(EarthquakeEvent.magnitude),
        )
        .filter(
            EarthquakeEvent.event_time >= start,
            EarthquakeEvent.event_time <= now_utc,
        )
        .group_by(bucket)
        .all()
    )
    by_bucket = {int(r[0]): (int(r[1]), float(r[2] or 0.0)) for r in rows}

    points = []
    for i in range(BUCKET_COUNT):
        count, avg_mag = by_bucket.get(i, (0, 0.0))
        label = (start + timedelta(hours=BUCKET_HOURS * i)).strftime("%H:%M")
        points.append(
            HourlyTimeSeriesPoint(time=label, count=count, avg_mag=round(avg_mag, 2))
        )
    return points


@router.get("/earthquakes", response_model=StatisticsResponse)
def get_earthquake_statistics(db: Session = Depends(get_db)):
    """Chỉ số KPI và chuỗi thời gian cho Dashboard.

    DB rỗng trả toàn số 0 và time_series_preview rỗng; DB lỗi trả 500 DATABASE_ERROR.
    """
    now_utc = datetime.now(UTC)
    one_day_ago = now_utc - timedelta(hours=24)

    try:
        total = db.query(func.count(EarthquakeEvent.id)).scalar() or 0
        strong = (
            db.query(func.count(EarthquakeEvent.id))
            .filter(EarthquakeEvent.magnitude >= 5.0)
            .scalar()
            or 0
        )
        moderate = (
            db.query(func.count(EarthquakeEvent.id))
            .filter(EarthquakeEvent.magnitude >= 4.0, EarthquakeEvent.magnitude < 5.0)
            .scalar()
            or 0
        )
        minor = (
            db.query(func.count(EarthquakeEvent.id))
            .filter(EarthquakeEvent.magnitude < 4.0)
            .scalar()
            or 0
        )
        recent_24h = (
            db.query(func.count(EarthquakeEvent.id))
            .filter(EarthquakeEvent.event_time >= one_day_ago)
            .scalar()
            or 0
        )
        avg_mag = db.query(func.avg(EarthquakeEvent.magnitude)).scalar() or 0.0
        max_mag = db.query(func.max(EarthquakeEvent.magnitude)).scalar() or 0.0
        latest = (
            db.query(EarthquakeEvent.event_time)
            .order_by(EarthquakeEvent.event_time.desc())
            .first()
        )
        series = _time_series_24h(db, now_utc) if total > 0 else []
    except SQLAlchemyError as exc:
        logger.error("Lỗi CSDL khi thống kê: %s", exc)
        return error_response(
            "DATABASE_ERROR", "Không thể truy vấn cơ sở dữ liệu.", 500, str(exc)
        )

    return StatisticsResponse(
        success=True,
        data=EarthquakeStatistics(
            total_events=total,
            strong_events_count=strong,
            moderate_events_count=moderate,
            minor_events_count=minor,
            recent_24h_count=recent_24h,
            avg_magnitude=round(float(avg_mag), 2),
            max_magnitude=round(float(max_mag), 1),
            latest_event_time=latest[0] if (latest and total > 0) else None,
            time_series_preview=series,
        ),
    )
