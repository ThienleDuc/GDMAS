"""Test gọn cho kênh SSE (realtime/sse.py): sự kiện phát ra theo trạng thái DB."""

import asyncio
import json

from gdmas.main import app
from gdmas.realtime import sse


class FakeRequest:
    """Client SSE giả: ngắt kết nối sau n lần kiểm tra."""

    def __init__(self, n):
        self.n = n

    async def is_disconnected(self):
        self.n -= 1
        return self.n < 0


def _state(total=5, new_events=None, new_run=None, **kw):
    state = {
        "success": True,
        "total": total,
        "strong_count": 0,
        "latest": None,
        "latest_run": None,
        "latest_run_id": 2 if new_run else 1,
        "max_id": 10,
        "new_events": new_events or [],
        "new_run_info": new_run,
    }
    state.update(kw)
    return state


def _collect(monkeypatch, initial, later):
    """Chạy generator với dãy trạng thái giả; trả về danh sách gói tin đã phát."""
    states = iter([initial, *later])
    monkeypatch.setattr(sse, "get_latest_state", lambda *_a: next(states))
    monkeypatch.setattr(sse, "POLL_INTERVAL_SECONDS", 0)

    async def run():
        return [
            m async for m in sse.earthquake_event_generator(FakeRequest(len(later)))
        ]

    return [json.loads(m["data"]) for m in asyncio.run(run())]


def _names(packets):
    return [p["event"] for p in packets]


def test_first_packet_is_welcome_heartbeat(monkeypatch):
    packets = _collect(monkeypatch, _state(), [])
    assert _names(packets) == ["heartbeat"]
    assert packets[0]["data"]["total_events"] == 5


def test_periodic_heartbeat_when_nothing_new(monkeypatch):
    packets = _collect(monkeypatch, _state(), [_state(), _state()])
    assert _names(packets) == ["heartbeat", "heartbeat", "heartbeat"]


def test_new_event_emits_earthquake_detected_without_alert(monkeypatch):
    new = [{"id": 11, "magnitude": 4.0}]
    packets = _collect(monkeypatch, _state(), [_state(new_events=new, max_id=11)])
    assert _names(packets) == ["heartbeat", "earthquake_detected"]


def test_strong_event_emits_earthquake_alert(monkeypatch):
    new = [{"id": 11, "magnitude": 4.5}, {"id": 12, "magnitude": 3.0}]
    packets = _collect(monkeypatch, _state(), [_state(new_events=new, max_id=12)])
    assert _names(packets) == ["heartbeat", "earthquake_detected", "earthquake_alert"]
    alert = packets[-1]["data"]
    assert [e["id"] for e in alert["alert_events"]] == [11]
    assert alert["max_magnitude"] == 4.5


def test_finished_ingestion_run_emits_cycle_completed(monkeypatch):
    run = {"records_processed": 3, "finished_at": None}
    packets = _collect(monkeypatch, _state(), [_state(new_run=run)])
    assert _names(packets) == ["heartbeat", "ingestion_cycle_completed"]
    assert packets[1]["data"]["records_processed"] == 3


def test_database_cleared_when_total_drops_to_zero(monkeypatch):
    packets = _collect(monkeypatch, _state(), [_state(total=0, max_id=0)])
    assert _names(packets) == ["heartbeat", "database_cleared"]


def test_transient_db_error_does_not_emit_database_cleared(monkeypatch):
    later = [{"success": False}, _state()]
    packets = _collect(monkeypatch, _state(), later)
    assert "database_cleared" not in _names(packets)
    assert _names(packets) == ["heartbeat", "heartbeat"]


def test_db_error_then_empty_db_still_reports_cleared_once(monkeypatch):
    later = [{"success": False}, _state(total=0, max_id=0)]
    packets = _collect(monkeypatch, _state(), later)
    assert _names(packets).count("database_cleared") == 1


def test_packets_follow_contract_with_utc_timestamp(monkeypatch):
    packets = _collect(monkeypatch, _state(), [])
    packet = packets[0]
    assert set(packet) == {"event", "data", "timestamp"}
    assert packet["timestamp"].endswith("Z")


def test_broadcast_pushes_database_cleared_to_connected_clients():
    queue = asyncio.Queue()
    sse._connected_sse_queues.add(queue)
    try:
        assert sse.broadcast_database_cleared_event() >= 1
        assert json.loads(queue.get_nowait()["data"])["event"] == "database_cleared"
    finally:
        sse._connected_sse_queues.discard(queue)


def test_both_stream_paths_are_registered():
    paths = set(app.openapi()["paths"])
    assert "/api/v1/events/stream" in paths
    assert "/api/v1/stream/earthquakes" in paths
