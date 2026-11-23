"""Unit test offline cho backfill 1 năm qua USGS FDSN (testcase 2026-11-22-be-country-region-derivation-thien).

Không gọi mạng: httpx.MockTransport + FakeSession + upsert giả.
"""

from datetime import UTC, datetime
from urllib.parse import parse_qs, urlparse

import httpx

from gdmas.services.ingestion import backfill as backfill_module
from gdmas.services.ingestion.backfill import (
    build_query_url,
    build_windows,
    run_backfill,
)
from gdmas.services.ingestion.upsert import UpsertStats


class FakeSession:
    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def add(self, _obj):
        return None

    def commit(self):
        return None

    def refresh(self, obj):
        obj.id = 1

    def rollback(self):
        return None

    def query(self, *_):
        return type("Query", (), {"count": lambda self: 2})()


def feature(event_id: str, place: str) -> dict:
    return {
        "type": "Feature",
        "id": event_id,
        "properties": {
            "mag": 5.2,
            "place": place,
            "time": 1794355200000,
            "updated": 1794358800000,
        },
        "geometry": {"type": "Point", "coordinates": [142.38, 38.29, 24.5]},
    }


def test_build_windows_covers_one_year():
    now = datetime(2026, 11, 23, tzinfo=UTC)
    windows = build_windows(now, 365)
    assert len(windows) == 13  # 12 đoạn 30 ngày + phần dư
    assert (windows[0][1] - windows[0][0]).days == 30
    assert windows[-1][1] == now

    url = build_query_url(windows[0][0], windows[0][1], 2.5)
    params = parse_qs(urlparse(url).query)
    assert params["format"] == ["geojson"]
    assert params["minmagnitude"] == ["2.5"]
    assert params["limit"] == ["20000"]


def test_backfill_uses_fdsn_and_derives_country_region(monkeypatch):
    captured = {}

    def fake_upsert(db, rows):
        captured["rows"] = list(rows)
        return UpsertStats(inserted=len(rows))

    monkeypatch.setattr(backfill_module, "upsert_events", fake_upsert)

    payload = {
        "features": [
            feature("jp1", "82 km ENE of Tokyo, Japan"),
            feature("id1", "Java, Indonesia"),
        ]
    }
    calls = []

    def handler(request: httpx.Request):
        calls.append(str(request.url))
        return httpx.Response(200, json=payload)

    result = run_backfill(
        session_factory=FakeSession,
        http_transport=httpx.MockTransport(handler),
        days=30,
    )

    assert result["success"] is True
    assert result["days"] == 30 and result["windows"] == 1
    assert result["inserted"] == 2
    assert len(calls) == 1 and "fdsnws/event/1/query" in calls[0]
    assert [(row["country"], row["region"]) for row in captured["rows"]] == [
        ("Japan", "Tokyo"),
        ("Indonesia", "Java"),
    ]


def test_backfill_never_falls_back_to_live_network(monkeypatch):
    """Nếu FDSN lỗi và không có transport thật, backfill không gọi mạng."""

    def handler(_request: httpx.Request):
        raise httpx.ConnectError("offline")

    result = run_backfill(
        session_factory=FakeSession,
        http_transport=httpx.MockTransport(handler),
        days=30,
    )
    assert result["success"] is False
