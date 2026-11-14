import logging
import math
from datetime import UTC, datetime

import httpx
from fastapi import APIRouter, Depends, Query
from sqlalchemy import asc, desc, or_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from gdmas.api.errors import error_response
from gdmas.db.connection import get_db
from gdmas.models.earthquake import EarthquakeEvent
from gdmas.schemas.earthquake import (
    EarthquakeListResponse,
    EarthquakeMetadata,
    EarthquakeResponse,
    SyncResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/earthquakes", tags=["Earthquakes"])

USGS_FEED_URL = (
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
)


def _db_error(exc: Exception):
    logger.error("Lỗi CSDL: %s", exc)
    return error_response(
        "DATABASE_ERROR", "Không thể truy vấn cơ sở dữ liệu.", 500, details=str(exc)
    )


def _parse_utc(value: str) -> datetime | None:
    """Phân tích chuỗi ISO 8601; không có múi giờ thì coi là UTC."""
    try:
        dt = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
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
            resp = client.get(USGS_FEED_URL)
            resp.raise_for_status()
            features = resp.json().get("features", [])
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("Lỗi khi gọi USGS Feed: %s", exc)
        return error_response(
            "DATA_SOURCE_UNAVAILABLE",
            "Không thể kết nối tới nguồn dữ liệu USGS.",
            503,
            details=str(exc),
        )

    synced_items = 0
    try:
        for feat in features:
            props = feat.get("properties", {})
            coords = feat.get("geometry", {}).get("coordinates", [0, 0, 0])

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
                    source_url=props.get("url"),
                    raw_data=feat,
                )
            )
            synced_items += 1
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
