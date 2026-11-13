import asyncio
import json
import logging
from datetime import UTC, datetime

from fastapi import APIRouter, Request
from sqlalchemy import desc
from sse_starlette.sse import EventSourceResponse

from gdmas.db.connection import SessionLocal
from gdmas.models.earthquake import EarthquakeEvent
from gdmas.models.service_run import ServiceRun

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stream", tags=["Streaming"])

# Tập hợp các hàng đợi asyncio.Queue của toàn bộ client SSE đang kết nối
_connected_sse_queues: set[asyncio.Queue] = set()


@router.post("/broadcast-cleared")
async def broadcast_database_cleared():
    """
    Endpoint kích hoạt thông báo CSDL đã bị xóa trống (Demo Bước 2)
    ngay lập tức tới toàn bộ các tab trình duyệt đang mở qua kết nối SSE.
    """
    cleared_payload = {
        "event": "database_cleared",
        "data": {
            "title": "CSDL Đã Bị Xóa Trống (Demo Bước 2/3)",
            "message": "Phát hiện CSDL đã được xóa bằng script demo. Giao diện đang tự động chuyển sang trạng thái rỗng thời gian thực.",
            "total_events": 0,
            "strong_count": 0,
        },
        "timestamp": datetime.now(UTC).isoformat(),
    }
    raw_message = {
        "event": "database_cleared",
        "data": json.dumps(cleared_payload),
    }

    count = 0
    for q in list(_connected_sse_queues):
        try:
            q.put_nowait(raw_message)
            count += 1
        except Exception as e:
            logger.warning(f"Lỗi khi push SSE cleared event vào queue: {e}")

    logger.warning(f"Đã broadcast tín hiệu database_cleared tới {count} SSE clients.")
    return {"success": True, "clients_notified": count}


def get_latest_state(
    since_event_id: int | None = None, since_run_id: int | None = None
):
    """Truy vấn an toàn trạng thái sự kiện mới nhất và chu kỳ chạy worker từ PostgreSQL."""
    try:
        with SessionLocal() as db:
            total = db.query(EarthquakeEvent).count()
            strong = (
                db.query(EarthquakeEvent)
                .filter(EarthquakeEvent.magnitude >= 5.0)
                .count()
            )

            latest_query = db.query(EarthquakeEvent).order_by(desc(EarthquakeEvent.id))
            latest = latest_query.first()
            max_id = latest.id if latest else 0

            new_events = []
            if since_event_id is not None and since_event_id >= 0:
                new_events_query = (
                    db.query(EarthquakeEvent)
                    .filter(EarthquakeEvent.id > since_event_id)
                    .order_by(desc(EarthquakeEvent.id))
                    .limit(20)
                )
                for ev in new_events_query.all():
                    new_events.append(
                        {
                            "id": ev.id,
                            "source": ev.source,
                            "source_event_id": ev.source_event_id,
                            "event_time": ev.event_time.isoformat()
                            if ev.event_time
                            else None,
                            "latitude": ev.latitude,
                            "longitude": ev.longitude,
                            "depth_km": ev.depth_km,
                            "magnitude": ev.magnitude,
                            "magnitude_type": ev.magnitude_type,
                            "place": ev.place,
                            "source_url": ev.source_url,
                        }
                    )

            latest_dict = None
            if latest:
                latest_dict = {
                    "id": latest.id,
                    "source": latest.source,
                    "source_event_id": latest.source_event_id,
                    "event_time": latest.event_time.isoformat()
                    if latest.event_time
                    else None,
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
            latest_run_dict = None
            if latest_run:
                latest_run_dict = {
                    "id": latest_run.id,
                    "status": latest_run.status,
                    "records_processed": latest_run.records_processed,
                    "finished_at": latest_run.finished_at.isoformat()
                    if latest_run.finished_at
                    else None,
                }

            new_run_info = None
            if (
                since_run_id is not None
                and latest_run
                and latest_run.id > since_run_id
                and latest_run.status == "SUCCESS"
            ):
                new_run_info = latest_run_dict

            return {
                "success": True,
                "total": total,
                "strong_count": strong,
                "latest": latest_dict,
                "max_id": max_id,
                "new_events": new_events,
                "latest_run_id": latest_run_id,
                "new_run_info": new_run_info,
                "latest_run": latest_run_dict,
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
    3. CSDL bị xóa trống (database_cleared).
    4. Nhịp tim định kỳ mỗi 3 giây (heartbeat).
    """
    client_queue: asyncio.Queue = asyncio.Queue()
    _connected_sse_queues.add(client_queue)

    async def event_generator():
        try:
            initial_state = await asyncio.to_thread(get_latest_state, None, None)
            last_id = initial_state.get("max_id", 0)
            last_run_id = initial_state.get("latest_run_id", 0)
            last_total = initial_state.get("total", 0)

            # Gửi sự kiện mở màn (heartbeat kèm trạng thái chu kỳ nạp mới nhất)
            welcome_payload = {
                "event": "heartbeat",
                "data": {
                    "message": "Kết nối SSE thời gian thực thành công.",
                    "total_events": initial_state.get("total", 0),
                    "strong_count": initial_state.get("strong_count", 0),
                    "latest_event": initial_state.get("latest"),
                    "latest_run": initial_state.get("latest_run"),
                },
                "timestamp": datetime.now(UTC).isoformat(),
            }

            yield {
                "event": "heartbeat",
                "data": json.dumps(welcome_payload),
            }

            while True:
                if await request.is_disconnected():
                    logger.info("SSE client đã ngắt kết nối.")
                    break

                # Kiểm tra thông điệp broadcast tức thời từ endpoint /broadcast-cleared
                try:
                    immediate_msg = client_queue.get_nowait()
                    if immediate_msg:
                        last_id = 0
                        last_total = 0
                        last_run_id = 0
                        yield immediate_msg
                        continue
                except asyncio.QueueEmpty:
                    pass

                await asyncio.sleep(2)

                # Kiểm tra lại queue sau nhịp sleep
                try:
                    immediate_msg = client_queue.get_nowait()
                    if immediate_msg:
                        last_id = 0
                        last_total = 0
                        last_run_id = 0
                        yield immediate_msg
                        continue
                except asyncio.QueueEmpty:
                    pass

                state = await asyncio.to_thread(get_latest_state, last_id, last_run_id)
                current_total = state.get("total", 0)
                max_id = state.get("max_id", 0)
                new_events = state.get("new_events", [])
                new_run_info = state.get("new_run_info")

                # 0. PHÁT HIỆN CSDL BỊ XÓA (Demo Bước 2/3: TRUNCATE CSDL)
                # Khi số lượng bản ghi rơi về 0 hoặc max_id < last_id và CSDL rỗng
                if (last_total > 0 and current_total == 0) or (
                    last_id > 0 and current_total == 0
                ):
                    logger.warning(
                        f"SSE phát hiện CSDL vừa bị xóa trống (total: {last_total} -> 0). Bắn sự kiện database_cleared."
                    )
                    last_id = 0
                    last_total = 0
                    last_run_id = 0
                    cleared_payload = {
                        "event": "database_cleared",
                        "data": {
                            "title": "CSDL Đã Bị Xóa Trống (Demo Bước 2/3)",
                            "message": "Phát hiện CSDL đã được xóa bằng script demo. Giao diện đang tự động chuyển sang trạng thái rỗng thời gian thực.",
                            "total_events": 0,
                            "strong_count": 0,
                        },
                        "timestamp": datetime.now(UTC).isoformat(),
                    }
                    yield {
                        "event": "database_cleared",
                        "data": json.dumps(cleared_payload),
                    }
                    continue

                last_total = current_total

            # 1. Nếu có chu kỳ cào USGS 5 phút vừa hoàn thành -> Bắn thông báo ingestion_cycle_completed
            if new_run_info:
                last_run_id = state.get("latest_run_id", last_run_id)
                if new_events:
                    last_id = max_id
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
                        "new_events": new_events,
                        "timestamp": new_run_info.get("finished_at")
                        or datetime.now(UTC).isoformat(),
                    },
                    "timestamp": datetime.now(UTC).isoformat(),
                }
                logger.info(
                    f"SSE dispatching ingestion_cycle_completed: Run #{new_run_info.get('id')} (+{cnt} records)"
                )
                yield {
                    "event": "ingestion_cycle_completed",
                    "data": json.dumps(ingestion_payload),
                }

            # 2. Nếu có sự kiện địa chấn mới nạp vào CSDL ngoài chu kỳ ingestion
            elif new_events:
                last_id = max_id
                detected_payload = {
                    "event": "earthquake_detected",
                    "data": {
                        "title": "Phát Hiện Sự Kiện Địa Chấn Mới",
                        "message": f"Phát hiện {len(new_events)} sự kiện địa chấn mới vừa nạp vào CSDL!",
                        "new_events": new_events,
                        "records_processed": len(new_events),
                        "total_events": state.get("total", 0),
                        "latest_event": state.get("latest"),
                    },
                    "timestamp": datetime.now(UTC).isoformat(),
                }
                yield {
                    "event": "earthquake_detected",
                    "data": json.dumps(detected_payload),
                }

            # 3. Nếu không có sự kiện mới, gửi heartbeat định kỳ kèm trạng thái run gần nhất
            if not new_run_info and not new_events:
                heartbeat_payload = {
                    "event": "heartbeat",
                    "data": {
                        "total_events": state.get("total", 0),
                        "strong_count": state.get("strong_count", 0),
                        "latest_event": state.get("latest"),
                        "latest_run": state.get("latest_run"),
                    },
                    "timestamp": datetime.now(UTC).isoformat(),
                }
                yield {
                    "event": "heartbeat",
                    "data": json.dumps(heartbeat_payload),
                }
        finally:
            _connected_sse_queues.discard(client_queue)
            logger.info("SSE client ngắt kết nối, đã xóa queue khỏi broadcast pool.")

    return EventSourceResponse(event_generator())
