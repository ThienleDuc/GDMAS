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
    "path",
    [
        "/api/v1/earthquakes?page=1&limit=2",
        "/api/v1/earthquakes/unit-event-not-found",
        "/api/v1/statistics/earthquakes",
    ],
)
def test_database_errors_preserve_response_and_log_safely(api, caplog, path):
    client, _ = api
    with caplog.at_level(logging.WARNING):
        response = client.get(path)
    assert response.status_code == 500
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "DATABASE_ERROR"
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
    assert response.status_code == 503
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "DATA_SOURCE_UNAVAILABLE"
    assert_safe_warning(caplog, "ConnectError")


def test_sync_database_error_logs_and_rolls_back(api, monkeypatch, caplog):
    client, session = api
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
    assert response.status_code == 500
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "DATABASE_ERROR"
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


def test_invalid_json_from_usgs_returns_503(api, monkeypatch, caplog):
    client, _ = api
    install_transport(
        monkeypatch, lambda request: httpx.Response(200, content=b"invalid json")
    )
    with caplog.at_level(logging.WARNING):
        result = client.post("/api/v1/earthquakes/sync")
    assert result.status_code == 503
    body = result.json()
    assert body["success"] is False
    assert body["error"]["code"] == "DATA_SOURCE_UNAVAILABLE"
    assert_safe_warning(caplog, "JSONDecodeError")


def test_incomplete_usgs_feature_is_skipped(api, monkeypatch):
    client, session = api
    install_transport(
        monkeypatch,
        lambda request: httpx.Response(200, json={"features": [{"properties": None}]}),
    )
    result = client.post("/api/v1/earthquakes/sync")
    assert result.status_code == 200 and result.json()["success"] is True
    assert result.json()["synced_count"] == 0
    assert session.rollbacks == 0
