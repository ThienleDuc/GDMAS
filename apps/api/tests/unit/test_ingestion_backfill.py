"""Unit test offline cho backfill all_month (testcase 2026-11-22-be-country-region-derivation-thien).

Không gọi mạng: httpx.MockTransport + FakeSession + upsert giả.
"""

import httpx

from gdmas.services.ingestion import service as service_module
from gdmas.services.ingestion.backfill import MONTH_FEED_URL, run_backfill
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


def test_backfill_uses_month_feed_and_derives_country_region(monkeypatch):
    captured = {}

    def fake_upsert(db, rows):
        captured["rows"] = list(rows)
        return UpsertStats(inserted=len(rows))

    monkeypatch.setattr(service_module, "upsert_events", fake_upsert)

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
    )

    assert result["success"] is True
    assert result["inserted"] == 2
    assert calls == [MONTH_FEED_URL]
    assert [(row["country"], row["region"]) for row in captured["rows"]] == [
        ("Japan", "Tokyo"),
        ("Indonesia", "Java"),
    ]


def test_backfill_never_falls_back_to_live_network(monkeypatch):
    """Nếu feed tháng lỗi và không có transport thật, backfill không được gọi mạng."""

    def handler(_request: httpx.Request):
        raise httpx.ConnectError("offline")

    result = run_backfill(
        session_factory=FakeSession,
        http_transport=httpx.MockTransport(handler),
    )
    assert result["success"] is False
