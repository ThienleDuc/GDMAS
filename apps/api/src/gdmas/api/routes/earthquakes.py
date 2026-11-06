import math
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, or_

from gdmas.db.connection import get_db
from gdmas.models.earthquake import EarthquakeEvent
from gdmas.schemas.earthquake import (
    EarthquakeResponse,
    EarthquakeListResponse,
    EarthquakeMetadata,
)

router = APIRouter(prefix="/earthquakes", tags=["Earthquakes"])

# Bộ dữ liệu mẫu chuẩn USGS dự phòng khi DB chưa có dữ liệu hoặc chạy mock local
MOCK_USGS_DATA: List[dict] = [
    {
        "id": 1,
        "source": "USGS",
        "source_event_id": "us7000m8ab",
        "event_time": datetime.now(timezone.utc) - timedelta(minutes=14),
        "latitude": 38.291,
        "longitude": 142.381,
        "depth_km": 12.4,
        "magnitude": 6.2,
        "magnitude_type": "mww",
        "place": "Near East Coast of Honshu, Japan",
        "source_url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000m8ab",
        "ingested_at": datetime.now(timezone.utc) - timedelta(minutes=10),
    },
    {
        "id": 2,
        "source": "USGS",
        "source_event_id": "us7000m8ac",
        "event_time": datetime.now(timezone.utc) - timedelta(hours=1, minutes=20),
        "latitude": -17.512,
        "longitude": -178.621,
        "depth_km": 35.0,
        "magnitude": 5.4,
        "magnitude_type": "mwb",
        "place": "Fiji Region",
        "source_url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000m8ac",
        "ingested_at": datetime.now(timezone.utc) - timedelta(hours=1),
    },
    {
        "id": 3,
        "source": "USGS",
        "source_event_id": "us7000m8ad",
        "event_time": datetime.now(timezone.utc) - timedelta(hours=3, minutes=15),
        "latitude": 35.689,
        "longitude": 25.122,
        "depth_km": 10.0,
        "magnitude": 4.8,
        "magnitude_type": "ml",
        "place": "Crete, Greece",
        "source_url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000m8ad",
        "ingested_at": datetime.now(timezone.utc) - timedelta(hours=3),
    },
    {
        "id": 4,
        "source": "USGS",
        "source_event_id": "us7000m8ae",
        "event_time": datetime.now(timezone.utc) - timedelta(hours=5, minutes=45),
        "latitude": 15.221,
        "longitude": 107.892,
        "depth_km": 8.5,
        "magnitude": 3.9,
        "magnitude_type": "md",
        "place": "Kon Tum, Vietnam",
        "source_url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000m8ae",
        "ingested_at": datetime.now(timezone.utc) - timedelta(hours=5),
    },
    {
        "id": 5,
        "source": "USGS",
        "source_event_id": "us7000m8af",
        "event_time": datetime.now(timezone.utc) - timedelta(hours=8),
        "latitude": -32.891,
        "longitude": -71.211,
        "depth_km": 28.0,
        "magnitude": 5.7,
        "magnitude_type": "mww",
        "place": "Valparaiso, Chile",
        "source_url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000m8af",
        "ingested_at": datetime.now(timezone.utc) - timedelta(hours=7, minutes=50),
    },
    {
        "id": 6,
        "source": "USGS",
        "source_event_id": "us7000m8ag",
        "event_time": datetime.now(timezone.utc) - timedelta(hours=11, minutes=30),
        "latitude": 61.218,
        "longitude": -149.900,
        "depth_km": 42.1,
        "magnitude": 4.3,
        "magnitude_type": "ml",
        "place": "Southern Alaska, United States",
        "source_url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000m8ag",
        "ingested_at": datetime.now(timezone.utc) - timedelta(hours=11),
    },
    {
        "id": 7,
        "source": "USGS",
        "source_event_id": "us7000m8ah",
        "event_time": datetime.now(timezone.utc) - timedelta(hours=14),
        "latitude": 0.812,
        "longitude": 127.321,
        "depth_km": 115.0,
        "magnitude": 6.8,
        "magnitude_type": "mww",
        "place": "Halmahera, Indonesia",
        "source_url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000m8ah",
        "ingested_at": datetime.now(timezone.utc) - timedelta(hours=13, minutes=45),
    },
    {
        "id": 8,
        "source": "USGS",
        "source_event_id": "us7000m8ai",
        "event_time": datetime.now(timezone.utc) - timedelta(hours=18),
        "latitude": 37.7749,
        "longitude": -122.4194,
        "depth_km": 9.2,
        "magnitude": 3.4,
        "magnitude_type": "md",
        "place": "Northern California, United States",
        "source_url": "https://earthquake.usgs.gov/earthquakes/eventpage/us7000m8ai",
        "ingested_at": datetime.now(timezone.utc) - timedelta(hours=17, minutes=30),
    },
]


@router.get("", response_model=EarthquakeListResponse)
def list_earthquakes(
    page: int = Query(1, ge=1, description="Số trang hiện tại"),
    limit: int = Query(20, ge=1, le=100, description="Số bản ghi mỗi trang"),
    min_magnitude: Optional[float] = Query(None, description="Lọc theo độ lớn tối thiểu"),
    max_magnitude: Optional[float] = Query(None, description="Lọc theo độ lớn tối đa"),
    search: Optional[str] = Query(None, description="Tìm kiếm theo khu vực hoặc mã sự kiện"),
    sort_by: str = Query("event_time", pattern="^(event_time|magnitude|depth_km)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
):
    """
    Truy vấn danh sách các sự kiện địa chấn có hỗ trợ phân trang, lọc theo độ lớn và tìm kiếm.
    """
    try:
        query = db.query(EarthquakeEvent)

        if min_magnitude is not None:
            query = query.filter(EarthquakeEvent.magnitude >= min_magnitude)
        if max_magnitude is not None:
            query = query.filter(EarthquakeEvent.magnitude <= max_magnitude)
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

        if total > 0:
            events = query.offset((page - 1) * limit).limit(limit).all()
            total_pages = math.ceil(total / limit)
            return EarthquakeListResponse(
                success=True,
                data=events,
                metadata=EarthquakeMetadata(
                    total=total,
                    page=page,
                    limit=limit,
                    total_pages=total_pages,
                    last_updated=datetime.now(timezone.utc),
                ),
            )
    except Exception:
        # Nếu chưa kết nối được DB hoặc DB rỗng trong môi trường dev, fallback sang dữ liệu mẫu
        pass

    # Xử lý fallback trên MOCK_USGS_DATA
    filtered = MOCK_USGS_DATA
    if min_magnitude is not None:
        filtered = [e for e in filtered if e["magnitude"] >= min_magnitude]
    if max_magnitude is not None:
        filtered = [e for e in filtered if e["magnitude"] <= max_magnitude]
    if search:
        s = search.lower()
        filtered = [
            e for e in filtered
            if s in e["place"].lower() or s in e["source_event_id"].lower()
        ]

    # Sắp xếp
    reverse = (order == "desc")
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
            last_updated=datetime.now(timezone.utc),
        ),
    )


@router.get("/{event_id}", response_model=EarthquakeResponse)
def get_earthquake(event_id: str, db: Session = Depends(get_db)):
    """
    Lấy thông tin chi tiết một sự kiện địa chấn theo id hoặc source_event_id.
    """
    try:
        event = None
        if event_id.isdigit():
            event = db.query(EarthquakeEvent).filter(EarthquakeEvent.id == int(event_id)).first()
        if not event:
            event = db.query(EarthquakeEvent).filter(EarthquakeEvent.source_event_id == event_id).first()

        if event:
            return event
    except Exception:
        pass

    for m in MOCK_USGS_DATA:
        if str(m["id"]) == event_id or m["source_event_id"] == event_id:
            return m

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy sự kiện địa chấn")
