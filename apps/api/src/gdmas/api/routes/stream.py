from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse

from gdmas.realtime.sse import (
    broadcast_database_cleared_event,
    earthquake_event_generator,
)

router = APIRouter(prefix="/stream", tags=["Streaming"])


@router.post("/broadcast-cleared")
async def broadcast_database_cleared():
    """Báo CSDL đã bị xóa trống (Demo Bước 2) tới mọi client SSE đang mở."""
    return {"success": True, "clients_notified": broadcast_database_cleared_event()}


@router.get("/earthquakes")
async def stream_earthquakes(request: Request):
    """Kênh SSE thời gian thực (đường dẫn cũ, Frontend đang dùng)."""
    return EventSourceResponse(earthquake_event_generator(request))
