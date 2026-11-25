import logging
from collections import Counter
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from gdmas.api.errors import error_response
from gdmas.db.connection import get_db
from gdmas.models.earthquake import EarthquakeEvent
from gdmas.schemas.earthquake import (
    EarthquakeStatistics,
    HourlyTimeSeriesPoint,
    MonthlyPeak,
    MonthlyPeaksResponse,
    StatisticsResponse,
)
from gdmas.services.analysis.filtered import scope

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/statistics", tags=["Statistics"])

BUCKET_HOURS = 3
BUCKET_COUNT = 8  # 8 khoảng x 3 giờ = 24 giờ gần nhất


def _parse_utc(raw: str | None) -> datetime | None:
    if raw is None:
        return None
    try:
        value = datetime.fromisoformat(raw.strip())
    except ValueError:
        return None
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


def _time_series_24h(
    db: Session,
    now_utc: datetime,
    country: str | None = None,
    region: str | None = None,
) -> list[HourlyTimeSeriesPoint]:
    """Chuỗi 8 khoảng 3 giờ trong 24 giờ gần nhất, tính từ dữ liệu thật (UTC)."""
    start = now_utc - timedelta(hours=BUCKET_HOURS * BUCKET_COUNT)
    bucket_seconds = BUCKET_HOURS * 3600
    bucket = func.floor(
        (func.extract("epoch", EarthquakeEvent.event_time) - start.timestamp())
        / bucket_seconds
    ).label("bucket")
    rows = (
        scope(
            db.query(
                bucket,
                func.count(EarthquakeEvent.id),
                func.avg(EarthquakeEvent.magnitude),
            ),
            country,
            region,
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
def get_earthquake_statistics(
    country: str | None = Query(None, description="Lọc theo quốc gia"),
    region: str | None = Query(None, description="Lọc theo khu vực"),
    start_time: str | None = Query(None, description="Từ thời điểm ISO 8601 UTC"),
    end_time: str | None = Query(None, description="Đến thời điểm ISO 8601 UTC"),
    min_magnitude: float | None = Query(
        None, description="Độ lớn tối thiểu (bộ lọc Danh mục)"
    ),
    max_magnitude: float | None = Query(
        None, description="Độ lớn tối đa (bộ lọc Danh mục)"
    ),
    min_depth: float | None = Query(
        None, description="Độ sâu tối thiểu km (bộ lọc Danh mục)"
    ),
    max_depth: float | None = Query(
        None, description="Độ sâu tối đa km (bộ lọc Danh mục)"
    ),
    db: Session = Depends(get_db),
):
    """Chỉ số KPI và chuỗi thời gian cho Dashboard.

    DB rỗng trả toàn số 0 và time_series_preview rỗng; DB lỗi trả 500 DATABASE_ERROR.
    """
    now_utc = datetime.now(UTC)
    one_day_ago = now_utc - timedelta(hours=24)
    start_dt, end_dt = _parse_utc(start_time), _parse_utc(end_time)

    def scoped(query):
        """Áp quốc gia/khu vực và cửa sổ Ngày/Tuần/Tháng cho mọi KPI."""
        query = scope(query, country, region)
        if start_dt is not None:
            query = query.filter(EarthquakeEvent.event_time >= start_dt)
        if end_dt is not None:
            query = query.filter(EarthquakeEvent.event_time <= end_dt)
        if min_magnitude is not None:
            query = query.filter(EarthquakeEvent.magnitude >= min_magnitude)
        if max_magnitude is not None:
            query = query.filter(EarthquakeEvent.magnitude <= max_magnitude)
        if min_depth is not None:
            query = query.filter(EarthquakeEvent.depth_km >= min_depth)
        if max_depth is not None:
            query = query.filter(EarthquakeEvent.depth_km <= max_depth)
        return query

    try:
        total = scoped(db.query(func.count(EarthquakeEvent.id))).scalar() or 0
        strong = (
            scoped(db.query(func.count(EarthquakeEvent.id)))
            .filter(EarthquakeEvent.magnitude >= 5.0)
            .scalar()
            or 0
        )
        moderate = (
            scoped(db.query(func.count(EarthquakeEvent.id)))
            .filter(EarthquakeEvent.magnitude >= 4.0, EarthquakeEvent.magnitude < 5.0)
            .scalar()
            or 0
        )
        minor = (
            scoped(db.query(func.count(EarthquakeEvent.id)))
            .filter(EarthquakeEvent.magnitude < 4.0)
            .scalar()
            or 0
        )
        recent_24h = (
            scoped(db.query(func.count(EarthquakeEvent.id)))
            .filter(EarthquakeEvent.event_time >= one_day_ago)
            .scalar()
            or 0
        )
        avg_mag = scoped(db.query(func.avg(EarthquakeEvent.magnitude))).scalar() or 0.0
        max_mag = scoped(db.query(func.max(EarthquakeEvent.magnitude))).scalar() or 0.0
        latest = (
            scoped(db.query(EarthquakeEvent.event_time))
            .order_by(EarthquakeEvent.event_time.desc())
            .first()
        )
        series = _time_series_24h(db, now_utc, country, region) if total > 0 else []
    except SQLAlchemyError as exc:
        logger.error("Lỗi CSDL khi thống kê: %s", type(exc).__name__)
        return error_response(
            "DATABASE_ERROR",
            "Không thể truy vấn cơ sở dữ liệu.",
            500,
            type(exc).__name__,
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


@router.get("/monthly-peaks", response_model=MonthlyPeaksResponse)
def get_monthly_peaks(
    country: str | None = Query(None, description="Lọc theo quốc gia"),
    region: str | None = Query(None, description="Lọc theo khu vực"),
    db: Session = Depends(get_db),
):
    """Số sự kiện theo tháng UTC (1..12) — biểu đồ cao điểm theo tháng trên Overview.

    Đếm từ sự kiện thật, không snapshot mùa vụ: dùng được ngay cả khi chưa đủ 24 tháng
    để `seasonal_decompose`. Không truyền filter → toàn cục.
    """
    try:
        rows = scope(db.query(EarthquakeEvent.event_time), country, region).all()
    except SQLAlchemyError as exc:
        logger.error("Lỗi CSDL khi thống kê theo tháng: %s", type(exc).__name__)
        return error_response(
            "DATABASE_ERROR",
            "Không thể truy vấn cơ sở dữ liệu.",
            500,
            type(exc).__name__,
        )

    counts: Counter[int] = Counter()
    for (value,) in rows:
        if value is None:
            continue
        moment = value if value.tzinfo is not None else value.replace(tzinfo=UTC)
        counts[moment.astimezone(UTC).month] += 1

    return MonthlyPeaksResponse(
        data=[
            MonthlyPeak(month=month, label=f"Tháng {month}", count=counts.get(month, 0))
            for month in range(1, 13)
        ]
    )
