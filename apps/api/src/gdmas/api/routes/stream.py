import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Request
from sqlalchemy import desc
from sse_starlette.sse import EventSourceResponse

from gdmas.db.connection import SessionLocal
from gdmas.models.earthquake import EarthquakeEvent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stream", tags=["Streaming"])


def get_latest_state(since_id: Optional[int] = None):
    """Truy vấn an toàn trạng thái sự kiện mới nhất từ PostgreSQL trong worker thread."""
    try:
        with SessionLocal() as db:
            total = db.query(EarthquakeEvent).count()
            strong = db.query(EarthquakeEvent).filter(EarthquakeEvent.magnitude >= 5.0).count()

            latest_query = db.query(EarthquakeEvent).order_by(desc(EarthquakeEvent.id))
            latest = latest_query.first()

            new_events = []
            if since_id is not None and since_id > 0:
                new_events_query = (
                    db.query(EarthquakeEvent)
                    .filter(EarthquakeEvent.id > since_id)
                    .order_by(desc(EarthquakeEvent.id))
                    .limit(20)
                )
                for ev in new_events_query.all():
                    new_events.append({
                        "id": ev.id,
                        "source": ev.source,
                        "source_event_id": ev.source_event_id,
                        "event_time": ev.event_time.isoformat() if ev.event_time else None,
                        "latitude": ev.latitude,
                        "longitude": ev.longitude,
                        "depth_km": ev.depth_km,
                        "magnitude": ev.magnitude,
                        "magnitude_type": ev.magnitude_type,
                        "place": ev.place,
                        "source_url": ev.source_url,
                    })

            latest_dict = None
            if latest:
                latest_dict = {
                    "id": latest.id,
                    "source": latest.source,
                    "source_event_id": latest.source_event_id,
                    "event_time": latest.event_time.isoformat() if latest.event_time else None,
                    "latitude": latest.latitude,
                    "longitude": latest.longitude,
                    "depth_km": latest.depth_km,
                    "magnitude": latest.magnitude,
                    "magnitude_type": latest.magnitude_type,
                    "place": latest.place,
                    "source_url": latest.source_url,
                }

            max_id = latest.id if latest else 0
            return {
                "success": True,
                "total": total,
                "strong_count": strong,
                "latest": latest_dict,
                "max_id": max_id,
                "new_events": new_events,
            }
    except Exception as e:
        logger.warning(f"Lỗi khi truy vấn SSE data: {e}")
        return {
            "success": False,
            "total": 0,
            "strong_count": 0,
            "latest": None,
            "max_id": since_id or 0,
            "new_events": [],
        }


@router.get("/earthquakes")
async def stream_earthquakes(request: Request):
    """
    Kênh SSE (Server-Sent Events) phát luồng dữ liệu địa chấn thời gian thực.
    Đẩy thông báo khi có sự kiện mới hoặc phát nhịp tim (heartbeat) định kỳ mỗi 5 giây.
    """
    async def event_generator():
        initial_state = await asyncio.to_thread(get_latest_state, None)
        last_id = initial_state.get("max_id", 0)

        # Gửi sự kiện mở màn (heartbeat)
        welcome_payload = {
            "event": "heartbeat",
            "data": {
                "message": "Kết nối SSE thời gian thực thành công.",
                "total_events": initial_state.get("total", 0),
                "strong_count": initial_state.get("strong_count", 0),
                "latest_event": initial_state.get("latest"),
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        yield {
            "event": "heartbeat",
            "data": json.dumps(welcome_payload),
        }

        while True:
            if await request.is_disconnected():
                logger.info("SSE client đã ngắt kết nối.")
                break

            await asyncio.sleep(5)

            state = await asyncio.to_thread(get_latest_state, last_id)
            new_events = state.get("new_events", [])
            max_id = state.get("max_id", last_id)

            if new_events:
                last_id = max_id
                detected_payload = {
                    "event": "earthquake_detected",
                    "data": {
                        "message": f"Phát hiện {len(new_events)} sự kiện địa chấn mới!",
                        "new_events": new_events,
                        "total_events": state.get("total", 0),
                        "latest_event": state.get("latest"),
                    },
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                yield {
                    "event": "earthquake_detected",
                    "data": json.dumps(detected_payload),
                }
            else:
                heartbeat_payload = {
                    "event": "heartbeat",
                    "data": {
                        "total_events": state.get("total", 0),
                        "strong_count": state.get("strong_count", 0),
                        "latest_event": state.get("latest"),
                    },
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                yield {
                    "event": "heartbeat",
                    "data": json.dumps(heartbeat_payload),
                }

    return EventSourceResponse(event_generator())

