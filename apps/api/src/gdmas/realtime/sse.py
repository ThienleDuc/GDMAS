"""Logic dùng chung cho kênh Real-time SSE (Terminal 6).

Được gọi bởi hai route: /api/v1/stream/earthquakes và /api/v1/events/stream.
"""

import asyncio
import json
import logging
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from typing import Any

from fastapi import Request
from sqlalchemy import desc

from gdmas.db.connection import SessionLocal
from gdmas.models.earthquake import EarthquakeEvent
from gdmas.models.service_run import ServiceRun

logger = logging.getLogger(__name__)

POLL_INTERVAL_SECONDS = 2
ALERT_MAGNITUDE = 4.5  # docs/workflow.md §3.5: cảnh báo khi M >= 4.5
STRONG_MAGNITUDE = 5.0

# Hàng đợi asyncio.Queue của toàn bộ client SSE đang kết nối
_connected_sse_queues: set[asyncio.Queue] = set()


def utc_now_iso() -> str:
    """Thời điểm hiện tại theo UTC ISO 8601 có hậu tố Z."""
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def _iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _event_to_dict(ev: EarthquakeEvent) -> dict[str, Any]:
    return {
        "id": ev.id,
        "source": ev.source,
        "source_event_id": ev.source_event_id,
        "event_time": _iso(ev.event_time),
        "latitude": ev.latitude,
        "longitude": ev.longitude,
        "depth_km": ev.depth_km,
        "magnitude": ev.magnitude,
        "magnitude_type": ev.magnitude_type,
        "place": ev.place,
        "source_url": ev.source_url,
    }


def _packet(event: str, data: dict[str, Any]) -> dict[str, str]:
    """Đóng gói theo contracts/schemas/sse-event.json: {event, data, timestamp}."""
    payload = {"event": event, "data": data, "timestamp": utc_now_iso()}
    return {"event": event, "data": json.dumps(payload)}


def _cleared_packet() -> dict[str, str]:
    return _packet(
        "database_cleared",
        {
            "title": "CSDL Đã Bị Xóa Trống (Demo Bước 2/3)",
            "message": (
                "Phát hiện CSDL đã được xóa bằng script demo. "
                "Giao diện đang tự động chuyển sang trạng thái rỗng thời gian thực."
            ),
            "total_events": 0,
            "strong_count": 0,
        },
    )


def broadcast_database_cleared_event() -> int:
    """Đẩy database_cleared tới mọi client đang kết nối. Trả về số client đã báo."""
    message = _cleared_packet()
    count = 0
    for q in list(_connected_sse_queues):
        try:
            q.put_nowait(message)
            count += 1
        except asyncio.QueueFull as exc:
            logger.warning("Lỗi khi push SSE cleared event vào queue: %s", exc)
    logger.warning("Đã broadcast tín hiệu database_cleared tới %d SSE clients.", count)
    return count


def get_latest_state(
    since_event_id: int | None = None, since_run_id: int | None = None
) -> dict[str, Any]:
    """Truy vấn trạng thái sự kiện và chu kỳ ingestion mới nhất từ PostgreSQL.

    Khi lỗi DB trả về success=False để generator bỏ qua chu kỳ đó
    (không được hiểu nhầm là CSDL bị xóa).
    """
    try:
        with SessionLocal() as db:
            total = db.query(EarthquakeEvent).count()
            strong = (
                db.query(EarthquakeEvent)
                .filter(EarthquakeEvent.magnitude >= STRONG_MAGNITUDE)
                .count()
            )
            latest = (
                db.query(EarthquakeEvent).order_by(desc(EarthquakeEvent.id)).first()
            )
            max_id = latest.id if latest else 0

            new_events: list[dict[str, Any]] = []
            if since_event_id is not None and since_event_id >= 0:
                rows = (
                    db.query(EarthquakeEvent)
                    .filter(EarthquakeEvent.id > since_event_id)
                    .order_by(desc(EarthquakeEvent.id))
                    .limit(20)
                    .all()
                )
                new_events = [_event_to_dict(ev) for ev in rows]

            latest_run = (
                db.query(ServiceRun)
                .filter(ServiceRun.service_name == "ingestion")
                .order_by(desc(ServiceRun.id))
                .first()
            )
            latest_run_dict = None
            if latest_run:
                latest_run_dict = {
                    "id": latest_run.id,
                    "status": latest_run.status,
                    "records_processed": latest_run.records_processed,
                    "finished_at": _iso(latest_run.finished_at),
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
                "latest": _event_to_dict(latest) if latest else None,
                "max_id": max_id,
                "new_events": new_events,
                "latest_run_id": latest_run.id if latest_run else 0,
                "new_run_info": new_run_info,
                "latest_run": latest_run_dict,
            }
    except Exception as exc:  # noqa: BLE001 - mọi lỗi DB đều chỉ bỏ qua chu kỳ
        logger.warning("Lỗi khi truy vấn SSE data: %s", exc)
        return {"success": False}


def _drain_queue(client_queue: asyncio.Queue) -> dict[str, str] | None:
    try:
        return client_queue.get_nowait()
    except asyncio.QueueEmpty:
        return None


async def earthquake_event_generator(
    request: Request,
) -> AsyncGenerator[dict[str, str], None]:
    """Generator SSE dùng chung: heartbeat, earthquake_detected, earthquake_alert,
    ingestion_cycle_completed, database_cleared."""
    client_queue: asyncio.Queue = asyncio.Queue()
    _connected_sse_queues.add(client_queue)
    try:
        initial = await asyncio.to_thread(get_latest_state, None, None)
        ready = bool(initial.get("success"))
        last_id = initial.get("max_id", 0)
        last_run_id = initial.get("latest_run_id", 0)
        last_total = initial.get("total", 0)

        yield _packet(
            "heartbeat",
            {
                "message": "Kết nối SSE thời gian thực thành công.",
                "total_events": initial.get("total", 0),
                "strong_count": initial.get("strong_count", 0),
                "latest_event": initial.get("latest"),
                "latest_run": initial.get("latest_run"),
            },
        )

        while True:
            if await request.is_disconnected():
                logger.info("SSE client đã ngắt kết nối.")
                break

            # Tín hiệu broadcast tức thời (trước và sau khi chờ)
            msg = _drain_queue(client_queue)
            if msg is None:
                await asyncio.sleep(POLL_INTERVAL_SECONDS)
                msg = _drain_queue(client_queue)
            if msg is not None:
                last_id = last_total = last_run_id = 0
                yield msg
                continue

            state = await asyncio.to_thread(get_latest_state, last_id, last_run_id)

            # Lỗi DB thoáng qua: giữ trạng thái cũ, bỏ qua chu kỳ (KHÔNG phát database_cleared)
            if not state.get("success"):
                logger.warning("SSE bỏ qua chu kỳ do không đọc được CSDL.")
                continue

            # Lần đầu đọc được sau khi lúc kết nối DB đang lỗi: lấy mốc, không phát gì
            if not ready:
                ready = True
                last_id = state["max_id"]
                last_run_id = state["latest_run_id"]
                last_total = state["total"]
                continue

            current_total = state["total"]
            new_events = state["new_events"]
            new_run_info = state["new_run_info"]

            # CSDL bị xóa trống (Demo Bước 2/3)
            if current_total == 0 and (last_total > 0 or last_id > 0):
                logger.warning("SSE phát hiện CSDL bị xóa trống (%d -> 0).", last_total)
                last_id = last_total = last_run_id = 0
                yield _cleared_packet()
                continue

            last_total = current_total

            if new_run_info:
                last_run_id = state["latest_run_id"]
                if new_events:
                    last_id = state["max_id"]
                cnt = new_run_info.get("records_processed", 0)
                message = (
                    f"Đã cào dữ liệu mới nhất từ USGS (+{cnt} sự kiện)."
                    if cnt > 0
                    else "Đã hoàn thành chu kỳ quét 5 phút: dữ liệu hiện tại là mới nhất."
                )
                yield _packet(
                    "ingestion_cycle_completed",
                    {
                        "title": "Cập Nhật Dữ Liệu Tự Động (Chu kỳ 5 phút)",
                        "message": message,
                        "records_processed": cnt,
                        "total_events": current_total,
                        "new_events": new_events,
                        "timestamp": new_run_info.get("finished_at") or utc_now_iso(),
                    },
                )
            elif new_events:
                last_id = state["max_id"]
                yield _packet(
                    "earthquake_detected",
                    {
                        "title": "Phát Hiện Sự Kiện Địa Chấn Mới",
                        "message": f"Phát hiện {len(new_events)} sự kiện địa chấn mới vừa được ghi nhận.",
                        "new_events": new_events,
                        "records_processed": len(new_events),
                        "total_events": current_total,
                        "latest_event": state["latest"],
                    },
                )

            # Cảnh báo ưu tiên: M >= 4.5 (độc lập với nhánh ở trên)
            alerts = [e for e in new_events if (e["magnitude"] or 0) >= ALERT_MAGNITUDE]
            if alerts:
                yield _packet(
                    "earthquake_alert",
                    {
                        "title": f"Cảnh Báo Động Đất M ≥ {ALERT_MAGNITUDE}",
                        "message": f"Có {len(alerts)} sự kiện có độ lớn từ {ALERT_MAGNITUDE} trở lên.",
                        "alert_events": alerts,
                        "max_magnitude": max(e["magnitude"] for e in alerts),
                        "total_events": current_total,
                    },
                )

            if not new_run_info and not new_events:
                yield _packet(
                    "heartbeat",
                    {
                        "total_events": current_total,
                        "strong_count": state["strong_count"],
                        "latest_event": state["latest"],
                        "latest_run": state["latest_run"],
                    },
                )
    finally:
        _connected_sse_queues.discard(client_queue)
        logger.info("SSE client ngắt kết nối, đã xóa queue khỏi broadcast pool.")
