import asyncio
import logging

from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse

from gdmas.db.connection import SessionLocal
from gdmas.realtime import sse as sse_mod
from gdmas.realtime.sse import earthquake_event_generator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stream", tags=["Streaming"])

# Tên module-level để test monkeypatch (cùng object mặc định với realtime.sse).
_connected_sse_queues = sse_mod._connected_sse_queues


def get_latest_state(
    since_event_id: int | None = None, since_run_id: int | None = None
):
    """Bọc sse.get_latest_state; dùng SessionLocal của module này (test monkeypatch)."""
    original = sse_mod.SessionLocal
    sse_mod.SessionLocal = SessionLocal
    try:
        return sse_mod.get_latest_state(since_event_id, since_run_id)
    finally:
        sse_mod.SessionLocal = original


@router.post("/broadcast-cleared")
async def broadcast_database_cleared():
    """Báo CSDL đã bị xóa trống (Demo Bước 2) tới mọi client SSE đang mở."""
    message = sse_mod._cleared_packet()
    count = 0
    for q in list(_connected_sse_queues):
        try:
            q.put_nowait(message)
            count += 1
        except asyncio.QueueFull as exc:
            logger.warning(
                "Lỗi khi push SSE cleared event vào queue: %s", type(exc).__name__
            )
    return {"success": True, "clients_notified": count}


@router.get("/earthquakes")
async def stream_earthquakes(request: Request):
    """Kênh SSE thời gian thực (đường dẫn cũ, Frontend đang dùng)."""
    return EventSourceResponse(earthquake_event_generator(request))
