"""Kiểm response của lỗi dự kiến và logging API/SSE, không gọi mạng hay DB thật."""

import asyncio
import logging

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from gdmas.api.routes import earthquakes, stream
from gdmas.db.connection import get_db
from gdmas.main import app

SENSITIVE_ERROR = (
    "postgresql://unit_user:unit_password@db.invalid/test?api_key=unit_token"
)


class BrokenSession:
    def __init__(self):
        self.rollbacks = 0
        self.closed = False

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.closed = True

    def query(self, *args):
        raise OperationalError(
            "SELECT offline_fixture", None, RuntimeError(SENSITIVE_ERROR)
        )

    def commit(self):
        raise OperationalError("COMMIT", None, RuntimeError(SENSITIVE_ERROR))

    def rollback(self):
        self.rollbacks += 1


@pytest.fixture
def api(monkeypatch):
    session = BrokenSession()
    monkeypatch.setitem(app.dependency_overrides, get_db, lambda: session)
    with TestClient(app) as client:
        yield client, session


def assert_safe_warning(caplog, expected_class):
    assert expected_class in caplog.text
    assert all(
        secret not in caplog.text
        for secret in ("unit_user", "unit_password", "unit_token")
    )


@pytest.mark.parametrize(
    "path, status_code",
    [
        ("/api/v1/earthquakes?page=1&limit=2", 200),
        ("/api/v1/earthquakes/unit-event-not-found", 404),
        ("/api/v1/statistics/earthquakes", 200),
    ],
)
def test_database_errors_preserve_response_and_log_safely(
    api, caplog, path, status_code
):
    client, _ = api
    with caplog.at_level(logging.WARNING):
        response = client.get(path)
    assert response.status_code == status_code
    if status_code == 200:
        assert response.json()["success"] is True
        assert "data" in response.json()
    assert_safe_warning(caplog, "OperationalError")


def install_transport(monkeypatch, handler):
    original = httpx.Client
    transport = httpx.MockTransport(handler)
    monkeypatch.setattr(
        earthquakes.httpx,
        "Client",
        lambda **kwargs: original(transport=transport, **kwargs),
    )


def test_source_error_preserves_sync_response_with_safe_log(api, monkeypatch, caplog):
    client, _ = api

    def fail(request):
        raise httpx.ConnectError(SENSITIVE_ERROR, request=request)

    install_transport(monkeypatch, fail)
    with caplog.at_level(logging.WARNING):
        response = client.post("/api/v1/earthquakes/sync")
    assert response.status_code == 200 and response.json()["success"] is True
    assert_safe_warning(caplog, "ConnectError")


def test_sync_database_error_logs_and_rolls_back(api, monkeypatch, caplog):
    client, session = api
    monkeypatch.setattr(earthquakes, "MOCK_USGS_DATA", [])
    payload = {
        "features": [
            {
                "id": "unit-event",
                "properties": {"mag": 3.0, "time": 1794355200000},
                "geometry": {"coordinates": [100.0, 10.0, 20.0]},
            }
        ]
    }
    install_transport(monkeypatch, lambda request: httpx.Response(200, json=payload))
    with caplog.at_level(logging.WARNING):
        response = client.post("/api/v1/earthquakes/sync")
    assert response.status_code == 200 and response.json()["success"] is True
    assert session.rollbacks == 1
    assert_safe_warning(caplog, "OperationalError")


def test_sse_database_error_preserves_cursor_and_closes_session(monkeypatch, caplog):
    session = BrokenSession()
    monkeypatch.setattr(stream, "SessionLocal", lambda: session)
    with caplog.at_level(logging.WARNING):
        result = stream.get_latest_state(since_event_id=42, since_run_id=7)
    assert result["success"] is False and session.closed
    assert result["max_id"] == 42 and result["latest_run_id"] == 7
    assert result["new_events"] == []
    assert_safe_warning(caplog, "OperationalError")


def test_full_queue_does_not_block_other_clients(monkeypatch):
    full, healthy = asyncio.Queue(maxsize=1), asyncio.Queue()
    full.put_nowait("occupied")
    monkeypatch.setattr(stream, "_connected_sse_queues", {full, healthy})
    assert asyncio.run(stream.broadcast_database_cleared()) == {
        "success": True,
        "clients_notified": 1,
    }
    assert healthy.get_nowait()["event"] == "database_cleared"


def test_unexpected_queue_bug_is_not_swallowed(monkeypatch):
    class BrokenQueue:
        def put_nowait(self, message):
            raise RuntimeError("unexpected queue bug")

    monkeypatch.setattr(stream, "_connected_sse_queues", {BrokenQueue()})
    with pytest.raises(RuntimeError, match="unexpected queue bug"):
        asyncio.run(stream.broadcast_database_cleared())


@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/earthquakes",
        "/api/v1/statistics/earthquakes",
        "/api/v1/earthquakes/unit-event",
    ],
)
def test_unexpected_programming_error_is_not_hidden_by_database_fallback(
    api, monkeypatch, path
):
    client, session = api

    def unexpected(*args):
        raise RuntimeError("unexpected query bug")

    monkeypatch.setattr(session, "query", unexpected)
    with pytest.raises(RuntimeError, match="unexpected query bug"):
        client.get(path)


@pytest.mark.parametrize("invalid_json", [True, False])
def test_invalid_source_payload_retains_sync_response(
    api, monkeypatch, caplog, invalid_json
):
    client, _ = api
    response = (
        httpx.Response(200, content=b"invalid json")
        if invalid_json
        else httpx.Response(200, json={"features": [{"properties": None}]})
    )
    install_transport(monkeypatch, lambda request: response)
    with caplog.at_level(logging.WARNING):
        result = client.post("/api/v1/earthquakes/sync")
    assert result.status_code == 200 and result.json()["success"] is True
    assert_safe_warning(caplog, "JSONDecodeError" if invalid_json else "AttributeError")
