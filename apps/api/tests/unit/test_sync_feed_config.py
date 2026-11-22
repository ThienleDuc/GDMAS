"""Test offline: POST /earthquakes/sync đọc USGS feed từ cấu hình (không hardcode)."""

import httpx

from gdmas.api.routes import earthquakes as eq_routes

URL = "/api/v1/earthquakes/sync"


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


def _patch_feed(monkeypatch, captured: dict):
    class FakeClient:
        def __init__(self, *_args, **_kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *_exc):
            return False

        def get(self, url):
            captured["url"] = url
            return _FakeResponse({"features": []})

    monkeypatch.setattr(eq_routes.httpx, "Client", FakeClient)


def test_sync_uses_configured_feed_url(client, monkeypatch):
    """TC-01/02 — URL gọi ra lấy từ settings, không phải hằng số hardcode."""
    custom = "https://example.test/custom-feed.geojson"
    monkeypatch.setattr(eq_routes.settings, "USGS_FEED_URL", custom)
    captured: dict = {}
    _patch_feed(monkeypatch, captured)

    resp = client.post(URL)

    assert resp.status_code == 200
    assert captured["url"] == custom
    assert "all_day.geojson" not in captured["url"]


def test_sync_response_envelope_unchanged(client, monkeypatch):
    """TC-03 — payload SyncResponse giữ nguyên dù đổi nguồn feed."""
    monkeypatch.setattr(
        eq_routes.settings,
        "USGS_FEED_URL",
        "https://example.test/custom-feed.geojson",
    )
    captured: dict = {}
    _patch_feed(monkeypatch, captured)

    body = client.post(URL).json()

    assert body["success"] is True
    assert body["synced_count"] == 0
    assert body["source"] == "USGS"
    assert isinstance(body["timestamp"], str)


def test_legacy_constant_still_importable():
    """TC-04 — alias cũ vẫn tồn tại để không phá import/test cũ (RULE-03)."""
    assert isinstance(eq_routes.USGS_FEED_URL, str)
    assert eq_routes.USGS_FEED_URL.endswith("all_day.geojson")


def test_sync_network_error_still_503(client, monkeypatch):
    """TC-05 regression — lỗi mạng vẫn trả envelope DATA_SOURCE_UNAVAILABLE."""
    custom = "https://example.test/custom-feed.geojson"
    monkeypatch.setattr(eq_routes.settings, "USGS_FEED_URL", custom)

    class BrokenClient:
        def __init__(self, *_a, **_k):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *_e):
            return False

        def get(self, _url):
            raise httpx.ConnectError("offline")

    monkeypatch.setattr(eq_routes.httpx, "Client", BrokenClient)

    resp = client.post(URL)

    assert resp.status_code == 503
    assert resp.json()["error"]["code"] == "DATA_SOURCE_UNAVAILABLE"
