from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse

from gdmas.realtime.sse import earthquake_event_generator

router = APIRouter(prefix="/events", tags=["Streaming"])


@router.get("/stream")
async def events_stream(request: Request):
    """Kênh SSE chuẩn theo docs/api/API.md §3.5 (dùng chung generator với /stream/earthquakes)."""
    return EventSourceResponse(earthquake_event_generator(request))
