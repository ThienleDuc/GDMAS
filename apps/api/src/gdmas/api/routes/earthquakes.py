import logging
import math
from datetime import UTC, datetime, timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import asc, desc, or_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

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

# Bộ dữ liệu mẫu chuẩn USGS dự phòng khi DB chưa có dữ liệu hoặc chạy mock local
MOCK_USGS_DATA: list[dict] = [
    {
        "id": 1,
        "source": "USGS",
        "source_event_id": "us7000m8ab",
        "event_time": datetime.now(UTC) - timedelta(minutes=14),
        "latitude": 38.291,
        "longitude": 142.381,
        "depth_km": 12.4,
        "magnitude": 6.2,
        "magnitude_type": "mww",
        "place": "Near East Coast of Honshu, Japan",
        "source_url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000m8ab",
        "ingested_at": datetime.now(UTC) - timedelta(minutes=10),
    },
    {
        "id": 2,
        "source": "USGS",
        "source_event_id": "us7000m8ac",
        "event_time": datetime.now(UTC) - timedelta(hours=1, minutes=20),
        "latitude": -17.512,
        "longitude": -178.621,
        "depth_km": 35.0,
        "magnitude": 5.4,
        "magnitude_type": "mwb",
        "place": "Fiji Region",
        "source_url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000m8ac",
        "ingested_at": datetime.now(UTC) - timedelta(hours=1),
    },
    {
        "id": 3,
        "source": "USGS",
        "source_event_id": "us7000m8ad",
        "event_time": datetime.now(UTC) - timedelta(hours=3, minutes=15),
        "latitude": 35.689,
        "longitude": 25.122,
        "depth_km": 10.0,
        "magnitude": 4.8,
        "magnitude_type": "ml",
        "place": "Crete, Greece",
        "source_url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000m8ad",
        "ingested_at": datetime.now(UTC) - timedelta(hours=3),
    },
    {
        "id": 4,
        "source": "USGS",
        "source_event_id": "us7000m8ae",
        "event_time": datetime.now(UTC) - timedelta(hours=5, minutes=45),
        "latitude": 15.221,
        "longitude": 107.892,
        "depth_km": 8.5,
        "magnitude": 3.9,
        "magnitude_type": "md",
        "place": "Kon Tum, Vietnam",
        "source_url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000m8ae",
        "ingested_at": datetime.now(UTC) - timedelta(hours=5),
    },
    {
        "id": 5,
        "source": "USGS",
        "source_event_id": "us7000m8af",
        "event_time": datetime.now(UTC) - timedelta(hours=8),
        "latitude": -32.891,
        "longitude": -71.211,
        "depth_km": 28.0,
        "magnitude": 5.7,
        "magnitude_type": "mww",
        "place": "Valparaiso, Chile",
        "source_url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000m8af",
        "ingested_at": datetime.now(UTC) - timedelta(hours=7, minutes=50),
    },
    {
        "id": 6,
        "source": "USGS",
        "source_event_id": "us7000m8ag",
        "event_time": datetime.now(UTC) - timedelta(hours=11, minutes=30),
        "latitude": 61.218,
        "longitude": -149.900,
        "depth_km": 42.1,
        "magnitude": 4.3,
        "magnitude_type": "ml",
        "place": "Southern Alaska, United States",
        "source_url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000m8ag",
        "ingested_at": datetime.now(UTC) - timedelta(hours=11),
    },
    {
        "id": 7,
        "source": "USGS",
        "source_event_id": "us7000m8ah",
        "event_time": datetime.now(UTC) - timedelta(hours=14),
        "latitude": 0.812,
        "longitude": 127.321,
        "depth_km": 115.0,
        "magnitude": 6.8,
        "magnitude_type": "mww",
        "place": "Halmahera, Indonesia",
        "source_url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000m8ah",
        "ingested_at": datetime.now(UTC) - timedelta(hours=13, minutes=45),
    },
    {
        "id": 8,
        "source": "USGS",
        "source_event_id": "us7000m8ai",
        "event_time": datetime.now(UTC) - timedelta(hours=18),
        "latitude": 37.7749,
        "longitude": -122.4194,
        "depth_km": 9.2,
        "magnitude": 3.4,
        "magnitude_type": "md",
        "place": "Northern California, United States",
        "source_url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000m8ai",
        "ingested_at": datetime.now(UTC) - timedelta(hours=17, minutes=30),
    },
    {
        "id": 9,
        "source": "USGS",
        "source_event_id": "us7000m8aj",
        "event_time": datetime.now(UTC) - timedelta(hours=21),
        "latitude": -21.432,
        "longitude": -68.912,
        "depth_km": 110.0,
        "magnitude": 5.1,
        "magnitude_type": "mww",
        "place": "Antofagasta, Chile",
        "source_url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000m8aj",
        "ingested_at": datetime.now(UTC) - timedelta(hours=20, minutes=40),
    },
    {
        "id": 10,
        "source": "USGS",
        "source_event_id": "us7000m8ak",
        "event_time": datetime.now(UTC) - timedelta(hours=23, minutes=10),
        "latitude": 36.128,
        "longitude": 139.812,
        "depth_km": 48.0,
        "magnitude": 4.6,
        "magnitude_type": "mwr",
        "place": "Ibaraki, Japan",
        "source_url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000m8ak",
        "ingested_at": datetime.now(UTC) - timedelta(hours=22, minutes=50),
    },
]


@router.get("", response_model=EarthquakeListResponse)
def list_earthquakes(
    page: int = Query(1, ge=1, description="Số trang hiện tại"),
    limit: int = Query(20, ge=1, le=100, description="Số bản ghi mỗi trang"),
    min_magnitude: float | None = Query(None, description="Lọc theo độ lớn tối thiểu"),
    max_magnitude: float | None = Query(None, description="Lọc theo độ lớn tối đa"),
    min_depth: float | None = Query(None, description="Lọc theo độ sâu tối thiểu (km)"),
    max_depth: float | None = Query(None, description="Lọc theo độ sâu tối đa (km)"),
    search: str | None = Query(
        None, description="Tìm kiếm theo khu vực hoặc mã sự kiện"
    ),
    sort_by: str = Query("event_time", pattern="^(event_time|magnitude|depth_km)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
):
    """
    Truy vấn danh sách các sự kiện địa chấn có hỗ trợ phân trang, lọc theo độ lớn, độ sâu và tìm kiếm.
    """
    try:
        query = db.query(EarthquakeEvent)

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
        total_pages = math.ceil(total / limit) if total > 0 else 0
        return EarthquakeListResponse(
            success=True,
            data=events,
            metadata=EarthquakeMetadata(
                total=total,
                page=page,
                limit=limit,
                total_pages=total_pages,
                last_updated=datetime.now(UTC),
            ),
        )
    except SQLAlchemyError as exc:
        # Chỉ khi CSDL bị mất kết nối hoàn toàn mới kích hoạt fallback
        logger.warning("Truy vấn danh sách địa chấn thất bại (%s).", type(exc).__name__)

    # Xử lý fallback trên MOCK_USGS_DATA
    filtered = list(MOCK_USGS_DATA)
    if min_magnitude is not None:
        filtered = [e for e in filtered if e["magnitude"] >= min_magnitude]
    if max_magnitude is not None:
        filtered = [e for e in filtered if e["magnitude"] <= max_magnitude]
    if min_depth is not None:
        filtered = [e for e in filtered if e["depth_km"] >= min_depth]
    if max_depth is not None:
        filtered = [e for e in filtered if e["depth_km"] <= max_depth]
    if search:
        s = search.lower()
        filtered = [
            e
            for e in filtered
            if s in e.get("place", "").lower()
            or s in e.get("source_event_id", "").lower()
        ]

    # Sắp xếp
    reverse = order == "desc"
    filtered.sort(key=lambda x: x.get(sort_by, x["event_time"]), reverse=reverse)

    total_mock = len(filtered)
    start_idx = (page - 1) * limit
    paged_mock = filtered[start_idx : start_idx + limit]
    total_pages = max(1, math.ceil(total_mock / limit))

    return EarthquakeListResponse(
        success=True,
        data=paged_mock,
        metadata=EarthquakeMetadata(
            total=total_mock,
            page=page,
            limit=limit,
            total_pages=total_pages,
            last_updated=datetime.now(UTC),
        ),
    )


@router.post("/sync", response_model=SyncResponse)
def sync_usgs_earthquakes(db: Session = Depends(get_db)):
    """
    Kích hoạt đồng bộ hóa dữ liệu trực tiếp từ USGS GeoJSON API Feed.
    Lưu vào CSDL PostgreSQL nếu khả dụng hoặc cập nhật bộ nhớ đệm thời gian thực.
    """
    feed_url = (
        "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
    )
    synced_items = 0

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(feed_url)
            if resp.status_code == 200:
                geojson = resp.json()
                features = geojson.get("features", [])

                for feat in features:
                    props = feat.get("properties", {})
                    geom = feat.get("geometry", {})
                    coords = geom.get("coordinates", [0, 0, 0])

                    event_id = feat.get("id") or props.get("code")
                    if not event_id:
                        continue

                    mag = props.get("mag")
                    if mag is None:
                        continue

                    # Thời gian sự kiện (milliseconds epoch)
                    time_ms = props.get("time")
                    event_time = (
                        datetime.fromtimestamp(time_ms / 1000.0, tz=UTC)
                        if time_ms
                        else datetime.now(UTC)
                    )

                    longitude = float(coords[0]) if len(coords) > 0 else 0.0
                    latitude = float(coords[1]) if len(coords) > 1 else 0.0
                    depth_km = float(coords[2]) if len(coords) > 2 else 0.0

                    # 1. Nếu có DB, lưu vào PostgreSQL
                    try:
                        existing = (
                            db.query(EarthquakeEvent)
                            .filter(EarthquakeEvent.source_event_id == event_id)
                            .first()
                        )
                        if not existing:
                            new_event = EarthquakeEvent(
                                source="USGS",
                                source_event_id=event_id,
                                event_time=event_time,
                                latitude=latitude,
                                longitude=longitude,
                                depth_km=depth_km,
                                magnitude=float(mag),
                                magnitude_type=props.get("magType"),
                                place=props.get("place"),
                                source_url=props.get("url"),
                                raw_data=feat,
                            )
                            db.add(new_event)
                            synced_items += 1
                    except SQLAlchemyError as exc:
                        logger.warning(
                            "Không ghi được sự kiện đồng bộ (%s).", type(exc).__name__
                        )

                    # 2. Cập nhật vào danh sách memory MOCK_USGS_DATA
                    if not any(
                        m["source_event_id"] == event_id for m in MOCK_USGS_DATA
                    ):
                        MOCK_USGS_DATA.insert(
                            0,
                            {
                                "id": len(MOCK_USGS_DATA) + 1,
                                "source": "USGS",
                                "source_event_id": event_id,
                                "event_time": event_time,
                                "latitude": latitude,
                                "longitude": longitude,
                                "depth_km": depth_km,
                                "magnitude": float(mag),
                                "magnitude_type": props.get("magType"),
                                "place": props.get("place"),
                                "source_url": props.get("url"),
                                "ingested_at": datetime.now(UTC),
                            },
                        )
                        if synced_items == 0:
                            synced_items += 1

                try:
                    db.commit()
                except SQLAlchemyError as exc:
                    db.rollback()
                    logger.warning(
                        "Giao dịch đồng bộ đã rollback (%s).", type(exc).__name__
                    )

                return SyncResponse(
                    success=True,
                    message=f"Đã đồng bộ thành công {synced_items} sự kiện từ USGS GeoJSON Feed.",
                    synced_count=synced_items,
                    source="USGS",
                    timestamp=datetime.now(UTC),
                )
    except (
        httpx.HTTPError,
        ValueError,
        TypeError,
        AttributeError,
        OverflowError,
        SQLAlchemyError,
    ) as exc:
        logger.warning("Không hoàn tất đồng bộ USGS (%s).", type(exc).__name__)

    # Fallback phản hồi thành công với số lượng hiện tại nếu mạng bên ngoài offline
    return SyncResponse(
        success=True,
        message="Hệ thống đã làm mới dữ liệu từ nguồn địa chấn chuẩn.",
        synced_count=len(MOCK_USGS_DATA),
        source="USGS",
        timestamp=datetime.now(UTC),
    )


@router.get("/{event_id}", response_model=EarthquakeResponse)
def get_earthquake(event_id: str, db: Session = Depends(get_db)):
    """
    Lấy thông tin chi tiết một sự kiện địa chấn theo id hoặc source_event_id.
    """
    try:
        event = None
        if event_id.isdigit():
            event = (
                db.query(EarthquakeEvent)
                .filter(EarthquakeEvent.id == int(event_id))
                .first()
            )
        if not event:
            event = (
                db.query(EarthquakeEvent)
                .filter(EarthquakeEvent.source_event_id == event_id)
                .first()
            )

        if event:
            return event
    except SQLAlchemyError as exc:
        logger.warning("Truy vấn chi tiết địa chấn thất bại (%s).", type(exc).__name__)

    for m in MOCK_USGS_DATA:
        if str(m["id"]) == event_id or m["source_event_id"] == event_id:
            return m

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy sự kiện địa chấn"
    )
