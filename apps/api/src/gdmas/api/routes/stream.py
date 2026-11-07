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
from gdmas.models.service_run import ServiceRun

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stream", tags=["Streaming"])


def get_latest_state(since_event_id: Optional[int] = None, since_run_id: Optional[int] = None):
    """Truy vấn an toàn trạng thái sự kiện mới nhất và chu kỳ chạy worker từ PostgreSQL."""
    try:
        with SessionLocal() as db:
            total = db.query(EarthquakeEvent).count()
            strong = db.query(EarthquakeEvent).filter(EarthquakeEvent.magnitude >= 5.0).count()

            latest_query = db.query(EarthquakeEvent).order_by(desc(EarthquakeEvent.id))
            latest = latest_query.first()
            max_id = latest.id if latest else 0

            new_events = []
            if since_event_id is not None and since_event_id > 0:
                new_events_query = (
                    db.query(EarthquakeEvent)
                    .filter(EarthquakeEvent.id > since_event_id)
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

            # Kiểm tra chu kỳ ServiceRun gần nhất của Terminal 2 (ingestion)
            latest_run = (
                db.query(ServiceRun)
                .filter(ServiceRun.service_name == "ingestion")
                .order_by(desc(ServiceRun.id))
                .first()
            )
            latest_run_id = latest_run.id if latest_run else 0
            new_run_info = None
            if since_run_id is not None and latest_run and latest_run.id > since_run_id and latest_run.status == "SUCCESS":
                new_run_info = {
                    "id": latest_run.id,
                    "records_processed": latest_run.records_processed,
                    "finished_at": latest_run.finished_at.isoformat() if latest_run.finished_at else None,
                }

            return {
                "success": True,
                "total": total,
                "strong_count": strong,
                "latest": latest_dict,
                "max_id": max_id,
                "new_events": new_events,
                "latest_run_id": latest_run_id,
                "new_run_info": new_run_info,
            }
    except Exception as e:
        logger.warning(f"Lỗi khi truy vấn SSE data: {e}")
        return {
            "success": False,
            "total": 0,
            "strong_count": 0,
            "latest": None,
            "max_id": since_event_id or 0,
            "new_events": [],
            "latest_run_id": since_run_id or 0,
            "new_run_info": None,
        }


@router.get("/earthquakes")
async def stream_earthquakes(request: Request):
    """
    Kênh SSE (Server-Sent Events) phát luồng dữ liệu địa chấn thời gian thực.
    Đẩy thông báo khi:
    1. Hoàn tất chu kỳ cào USGS 5 phút (ingestion_cycle_completed).
    2. Phát hiện có động đất mới nạp vào CSDL (earthquake_detected).
    3. Nhịp tim định kỳ mỗi 5 giây (heartbeat).
    """
    async def event_generator():
        initial_state = await asyncio.to_thread(get_latest_state, None, None)
        last_id = initial_state.get("max_id", 0)
        last_run_id = initial_state.get("latest_run_id", 0)

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

            state = await asyncio.to_thread(get_latest_state, last_id, last_run_id)
            new_events = state.get("new_events", [])
            max_id = state.get("max_id", last_id)
            new_run_info = state.get("new_run_info")

            # 1. Nếu có chu kỳ cào USGS 5 phút vừa hoàn thành -> Bắn thông báo ingestion_cycle_completed
            if new_run_info:
                last_run_id = state.get("latest_run_id", last_run_id)
                cnt = new_run_info.get("records_processed", 0)
                if cnt > 0:
                    msg = f"Đã cào dữ liệu mới nhất từ USGS (+{cnt} sự kiện mới nạp vào CSDL)."
                else:
                    msg = "Đã hoàn thành chu kỳ quét 5 phút: Dữ liệu hiện tại là mới nhất từ USGS."

                ingestion_payload = {
                    "event": "ingestion_cycle_completed",
                    "data": {
                        "title": "Cập Nhật Dữ Liệu Tự Động (Chu kỳ 5 phút)",
                        "message": msg,
                        "records_processed": cnt,
                        "total_events": state.get("total", 0),
                        "timestamp": new_run_info.get("finished_at") or datetime.now(timezone.utc).isoformat(),
                    },
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                yield {
                    "event": "ingestion_cycle_completed",
                    "data": json.dumps(ingestion_payload),
                }

            # 2. Nếu có sự kiện địa chấn mới nạp vào CSDL
            if new_events:
                last_id = max_id
                detected_payload = {
                    "event": "earthquake_detected",
                    "data": {
                        "title": "Phát Hiện Sự Kiện Địa Chấn Mới",
                        "message": f"Phát hiện {len(new_events)} sự kiện địa chấn mới vừa nạp vào CSDL!",
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

            # 3. Nếu không có sự kiện mới, gửi heartbeat định kỳ
            if not new_run_info and not new_events:
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
