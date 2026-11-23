import logging
import math
from datetime import UTC, datetime

import httpx
from fastapi import APIRouter, Depends, Query
from sqlalchemy import asc, desc, func, or_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from gdmas.api.errors import error_response
from gdmas.core.config import settings
from gdmas.db.connection import get_db
from gdmas.models.earthquake import EarthquakeEvent
from gdmas.schemas.earthquake import (
    CountryCount,
    CountryListResponse,
    EarthquakeListResponse,
    EarthquakeMetadata,
    EarthquakeResponse,
    RegionCount,
    RegionListResponse,
    SyncResponse,
)
from gdmas.services.ingestion.geo import derive_place_fields

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/earthquakes", tags=["Earthquakes"])

# Legacy alias — giữ cho import/test cũ (RULE-03). Nguồn sự thật là settings.USGS_FEED_URL.
USGS_FEED_URL = (
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
)


def _db_error(exc: Exception):
    logger.error("Lỗi CSDL: %s", type(exc).__name__)
    return error_response(
        "DATABASE_ERROR",
        "Không thể truy vấn cơ sở dữ liệu.",
        500,
        details=type(exc).__name__,
    )


def _parse_utc(value: str | None) -> datetime | None:
    """Phân tích chuỗi ISO 8601; không có múi giờ thì coi là UTC; None → None."""
    if value is None:
        return None
    try:
        dt = datetime.fromisoformat(value.strip())
    except ValueError:
        return None
    return dt.replace(tzinfo=UTC) if dt.tzinfo is None else dt.astimezone(UTC)


def _validation_error(field: str, value: str, message: str):
    return error_response(
        "VALIDATION_ERROR", message, 400, details={"field": field, "value": value}
    )


@router.get("", response_model=EarthquakeListResponse)
def list_earthquakes(
    page: int = Query(1, ge=1, description="Số trang hiện tại"),
    limit: int = Query(20, ge=1, le=100, description="Số bản ghi mỗi trang"),
    min_magnitude: float | None = Query(None, description="Độ lớn tối thiểu"),
    max_magnitude: float | None = Query(None, description="Độ lớn tối đa"),
    min_depth: float | None = Query(None, description="Độ sâu tối thiểu (km)"),
    max_depth: float | None = Query(None, description="Độ sâu tối đa (km)"),
    search: str | None = Query(None, description="Tìm theo khu vực hoặc mã sự kiện"),
    country: str | None = Query(None, description="Lọc theo quốc gia suy từ place"),
    region: str | None = Query(None, description="Lọc theo khu vực suy từ place"),
    start_time: str | None = Query(None, description="Từ thời điểm (ISO 8601 UTC)"),
    end_time: str | None = Query(None, description="Đến thời điểm (ISO 8601 UTC)"),
    min_lat: float | None = Query(None, ge=-90, le=90),
    max_lat: float | None = Query(None, ge=-90, le=90),
    min_lon: float | None = Query(None, ge=-180, le=180),
    max_lon: float | None = Query(None, ge=-180, le=180),
    sort_by: str = Query("event_time", pattern="^(event_time|magnitude|depth_km)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
):
    """Danh sách sự kiện địa chấn (phân trang, lọc, tìm kiếm).

    DB rỗng trả 200 với danh sách rỗng; DB lỗi trả 500 DATABASE_ERROR.
    """
    start_dt = end_dt = None
    for field, raw in (("start_time", start_time), ("end_time", end_time)):
        if raw is None:
            continue
        parsed = _parse_utc(raw)
        if parsed is None:
            return _validation_error(field, raw, f"{field} phải là ISO 8601 hợp lệ")
        if field == "start_time":
            start_dt = parsed
        else:
            end_dt = parsed

    ranges = [
        ("min_magnitude", min_magnitude, "max_magnitude", max_magnitude),
        ("min_depth", min_depth, "max_depth", max_depth),
        ("min_lat", min_lat, "max_lat", max_lat),
        ("min_lon", min_lon, "max_lon", max_lon),
        ("start_time", start_dt, "end_time", end_dt),
    ]
    for lo_name, lo, hi_name, hi in ranges:
        if lo is not None and hi is not None and lo > hi:
            return _validation_error(
                lo_name, str(lo), f"{lo_name} không được lớn hơn {hi_name}"
            )

    try:
        query = db.query(EarthquakeEvent)

        if start_dt is not None:
            query = query.filter(EarthquakeEvent.event_time >= start_dt)
        if end_dt is not None:
            query = query.filter(EarthquakeEvent.event_time <= end_dt)
        if min_lat is not None:
            query = query.filter(EarthquakeEvent.latitude >= min_lat)
        if max_lat is not None:
            query = query.filter(EarthquakeEvent.latitude <= max_lat)
        if min_lon is not None:
            query = query.filter(EarthquakeEvent.longitude >= min_lon)
        if max_lon is not None:
            query = query.filter(EarthquakeEvent.longitude <= max_lon)
        if min_magnitude is not None:
            query = query.filter(EarthquakeEvent.magnitude >= min_magnitude)
        if max_magnitude is not None:
            query = query.filter(EarthquakeEvent.magnitude <= max_magnitude)
        if min_depth is not None:
            query = query.filter(EarthquakeEvent.depth_km >= min_depth)
        if max_depth is not None:
            query = query.filter(EarthquakeEvent.depth_km <= max_depth)
        if search:
            query = query.filter(
                or_(
                    EarthquakeEvent.place.ilike(f"%{search}%"),
                    EarthquakeEvent.source_event_id.ilike(f"%{search}%"),
                )
            )
        if country:
            query = query.filter(EarthquakeEvent.country == country)
        if region:
            query = query.filter(EarthquakeEvent.region == region)

        sort_col = getattr(EarthquakeEvent, sort_by, EarthquakeEvent.event_time)
        query = query.order_by(desc(sort_col) if order == "desc" else asc(sort_col))

        total = query.count()
        events = (
            query.offset((page - 1) * limit).limit(limit).all() if total > 0 else []
        )
    except SQLAlchemyError as exc:
        return _db_error(exc)

    return EarthquakeListResponse(
        success=True,
        data=events,
        metadata=EarthquakeMetadata(
            total=total,
            page=page,
            limit=limit,
            total_pages=math.ceil(total / limit) if total > 0 else 0,
            last_updated=datetime.now(UTC),
        ),
    )


@router.post("/sync", response_model=SyncResponse)
def sync_usgs_earthquakes(db: Session = Depends(get_db)):
    """Đồng bộ trực tiếp từ USGS GeoJSON Feed vào PostgreSQL.

    USGS không truy cập được -> 503 DATA_SOURCE_UNAVAILABLE; lỗi ghi DB -> 500.
    """
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(settings.USGS_FEED_URL)
            resp.raise_for_status()
            features = resp.json().get("features", [])
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("Lỗi khi gọi USGS Feed: %s", type(exc).__name__)
        return error_response(
            "DATA_SOURCE_UNAVAILABLE",
            "Không thể kết nối tới nguồn dữ liệu USGS.",
            503,
            details=type(exc).__name__,
        )

    synced_items = 0
    try:
        for feat in features:
            props = feat.get("properties") or {}
            geom = feat.get("geometry") or {}
            coords = geom.get("coordinates") or [0, 0, 0]

            event_id = feat.get("id") or props.get("code")
            mag = props.get("mag")
            if not event_id or mag is None:
                continue

            time_ms = props.get("time")
            event_time = (
                datetime.fromtimestamp(time_ms / 1000.0, tz=UTC)
                if time_ms
                else datetime.now(UTC)
            )

            existing = (
                db.query(EarthquakeEvent)
                .filter(EarthquakeEvent.source_event_id == event_id)
                .first()
            )
            if existing:
                continue

            country, region = derive_place_fields(props.get("place"))
            db.add(
                EarthquakeEvent(
                    source="USGS",
                    source_event_id=event_id,
                    event_time=event_time,
                    latitude=float(coords[1]) if len(coords) > 1 else 0.0,
                    longitude=float(coords[0]) if len(coords) > 0 else 0.0,
                    depth_km=float(coords[2]) if len(coords) > 2 else 0.0,
                    magnitude=float(mag),
                    magnitude_type=props.get("magType"),
                    place=props.get("place"),
                    country=country,
                    region=region,
                    source_url=props.get("url"),
                    raw_data=feat,
                )
            )
            synced_items += 1
        if synced_items:
            db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        return _db_error(exc)

    return SyncResponse(
        success=True,
        message=f"Đã đồng bộ thành công {synced_items} sự kiện từ USGS GeoJSON Feed.",
        synced_count=synced_items,
        source="USGS",
        timestamp=datetime.now(UTC),
    )


@router.get("/countries", response_model=CountryListResponse)
def list_earthquake_countries(
    start_time: str | None = Query(None, description="Từ thời điểm ISO 8601 UTC"),
    end_time: str | None = Query(None, description="Đến thời điểm ISO 8601 UTC"),
    db: Session = Depends(get_db),
):
    """Danh mục quốc gia kèm count/avg/max — cho bộ lọc và xếp hạng FE."""
    start, end = _parse_utc(start_time), _parse_utc(end_time)
    query = db.query(
        EarthquakeEvent.country,
        func.count(EarthquakeEvent.id),
        func.avg(EarthquakeEvent.magnitude),
        func.max(EarthquakeEvent.magnitude),
    ).filter(EarthquakeEvent.country.is_not(None))
    if start is not None:
        query = query.filter(EarthquakeEvent.event_time >= start)
    if end is not None:
        query = query.filter(EarthquakeEvent.event_time <= end)

    try:
        rows = (
            query.group_by(EarthquakeEvent.country)
            .order_by(
                func.count(EarthquakeEvent.id).desc(), EarthquakeEvent.country.asc()
            )
            .all()
        )
    except SQLAlchemyError as exc:
        return _db_error(exc)

    return CountryListResponse(
        data=[
            CountryCount(
                country=country,
                count=count,
                avg_magnitude=round(float(avg), 2) if avg is not None else None,
                max_magnitude=round(float(maximum), 2) if maximum is not None else None,
            )
            for country, count, avg, maximum in rows
        ]
    )


@router.get("/regions", response_model=RegionListResponse)
def list_earthquake_regions(
    country: str | None = Query(None, description="Chỉ lấy khu vực của quốc gia này"),
    start_time: str | None = Query(None, description="Từ thời điểm ISO 8601 UTC"),
    end_time: str | None = Query(None, description="Đến thời điểm ISO 8601 UTC"),
    db: Session = Depends(get_db),
):
    """Danh mục khu vực kèm count/avg/max trong cửa sổ thời gian — cho xếp hạng FE."""
    query = db.query(
        EarthquakeEvent.region,
        func.count(EarthquakeEvent.id),
        func.avg(EarthquakeEvent.magnitude),
        func.max(EarthquakeEvent.magnitude),
    ).filter(EarthquakeEvent.region.is_not(None))
    if country:
        query = query.filter(EarthquakeEvent.country == country)
    start, end = _parse_utc(start_time), _parse_utc(end_time)
    if start is not None:
        query = query.filter(EarthquakeEvent.event_time >= start)
    if end is not None:
        query = query.filter(EarthquakeEvent.event_time <= end)

    try:
        rows = (
            query.group_by(EarthquakeEvent.region)
            .order_by(
                func.count(EarthquakeEvent.id).desc(), EarthquakeEvent.region.asc()
            )
            .all()
        )
    except SQLAlchemyError as exc:
        return _db_error(exc)

    return RegionListResponse(
        data=[
            RegionCount(
                region=region,
                count=count,
                avg_magnitude=round(float(avg), 2) if avg is not None else None,
                max_magnitude=round(float(maximum), 2) if maximum is not None else None,
            )
            for region, count, avg, maximum in rows
        ]
    )


@router.get("/{event_id}", response_model=EarthquakeResponse)
def get_earthquake(event_id: str, db: Session = Depends(get_db)):
    """Chi tiết một sự kiện theo id hoặc source_event_id."""
    try:
        event = None
        if event_id.isdigit():
            event = (
                db.query(EarthquakeEvent)
                .filter(EarthquakeEvent.id == int(event_id))
                .first()
            )
        if event is None:
            event = (
                db.query(EarthquakeEvent)
                .filter(EarthquakeEvent.source_event_id == event_id)
                .first()
            )
    except SQLAlchemyError as exc:
        return _db_error(exc)

    if event is None:
        return error_response(
            "RESOURCE_NOT_FOUND",
            "Không tìm thấy sự kiện địa chấn.",
            404,
            details={"event_id": event_id},
        )
    return event
