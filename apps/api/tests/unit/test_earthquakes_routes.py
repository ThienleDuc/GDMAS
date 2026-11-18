"""Test route /api/v1/earthquakes: lọc, phân trang, DB rỗng, DB lỗi, đồng bộ USGS."""

from datetime import UTC, datetime, timedelta

import httpx
import pytest

from gdmas.api.routes import earthquakes as eq_routes

from .conftest import add_event

URL = "/api/v1/earthquakes"


def _ids(resp):
    return {e["source_event_id"] for e in resp.json()["data"]}


# ---------- DB rỗng / DB lỗi (Demo Bước 2–3) ----------
def test_list_empty_db_returns_real_empty_result(client):
    resp = client.get(URL)
    body = resp.json()
    assert resp.status_code == 200
    assert body["success"] is True
    assert body["data"] == []
    assert body["metadata"]["total"] == 0
    assert body["metadata"]["total_pages"] == 0


def test_list_db_error_returns_500_database_error_not_mock(broken_client):
    resp = broken_client.get(URL)
    body = resp.json()
    assert resp.status_code == 500
    assert body["success"] is False
    assert body["error"]["code"] == "DATABASE_ERROR"
    assert "data" not in body
    assert "1248" not in resp.text


def test_detail_db_error_returns_500(broken_client):
    resp = broken_client.get(f"{URL}/ev0001")
    assert resp.status_code == 500
    assert resp.json()["error"]["code"] == "DATABASE_ERROR"


def test_module_has_no_static_mock_data():
    assert not hasattr(eq_routes, "MOCK_USGS_DATA")


# ---------- danh sách, phân trang, sắp xếp ----------
def test_list_returns_stored_events_with_utc_envelope(client, db):
    add_event(db, 1)
    add_event(db, 2)
    resp = client.get(URL)
    body = resp.json()
    assert resp.status_code == 200
    assert body["metadata"]["total"] == 2
    assert _ids(resp) == {"ev0001", "ev0002"}


def test_pagination_splits_results(client, db):
    for i in range(1, 6):
        add_event(db, i)
    page1 = client.get(URL, params={"limit": 2, "page": 1}).json()
    page3 = client.get(URL, params={"limit": 2, "page": 3}).json()
    assert len(page1["data"]) == 2
    assert len(page3["data"]) == 1
    assert page1["metadata"]["total"] == 5
    assert page1["metadata"]["total_pages"] == 3


def test_sort_by_magnitude_desc(client, db):
    add_event(db, 1, magnitude=3.0)
    add_event(db, 2, magnitude=6.0)
    add_event(db, 3, magnitude=4.5)
    data = client.get(URL, params={"sort_by": "magnitude", "order": "desc"}).json()[
        "data"
    ]
    assert [e["magnitude"] for e in data] == [6.0, 4.5, 3.0]


def test_invalid_sort_field_is_rejected(client):
    assert client.get(URL, params={"sort_by": "password"}).status_code == 422


# ---------- bộ lọc ----------
def test_filter_by_magnitude_range(client, db):
    add_event(db, 1, magnitude=2.0)
    add_event(db, 2, magnitude=4.5)
    add_event(db, 3, magnitude=7.0)
    resp = client.get(URL, params={"min_magnitude": 4, "max_magnitude": 6})
    assert _ids(resp) == {"ev0002"}


def test_filter_by_depth_range(client, db):
    add_event(db, 1, depth_km=5)
    add_event(db, 2, depth_km=300)
    resp = client.get(URL, params={"min_depth": 100})
    assert _ids(resp) == {"ev0002"}


def test_filter_by_bounding_box(client, db):
    add_event(db, 1, latitude=-20, longitude=-170)
    add_event(db, 2, latitude=35, longitude=140)
    add_event(db, 3, latitude=-10, longitude=-175)
    resp = client.get(
        URL,
        params={"min_lat": -30, "max_lat": 0, "min_lon": -180, "max_lon": -160},
    )
    assert _ids(resp) == {"ev0001", "ev0003"}


def test_filter_by_time_range_iso_utc(client, db):
    now = datetime.now(UTC)
    add_event(db, 1, event_time=now - timedelta(days=10))
    add_event(db, 2, event_time=now - timedelta(days=2))
    add_event(db, 3, event_time=now - timedelta(hours=1))
    start = (now - timedelta(days=3)).isoformat().replace("+00:00", "Z")
    end = (now - timedelta(days=1)).isoformat().replace("+00:00", "Z")
    resp = client.get(URL, params={"start_time": start, "end_time": end})
    assert _ids(resp) == {"ev0002"}


def test_filter_by_search_matches_place_or_id(client, db):
    add_event(db, 1, place="226 km E of Levuka, Fiji")
    add_event(db, 2, place="Tokyo, Japan")
    assert _ids(client.get(URL, params={"search": "fiji"})) == {"ev0001"}
    assert _ids(client.get(URL, params={"search": "ev0002"})) == {"ev0002"}


def test_filter_with_no_match_returns_empty_not_error(client, db):
    add_event(db, 1, magnitude=3.0)
    resp = client.get(URL, params={"min_magnitude": 8})
    assert resp.status_code == 200
    assert resp.json()["data"] == []


# ---------- 400 VALIDATION_ERROR ----------
@pytest.mark.parametrize(
    ("params", "field"),
    [
        ({"min_magnitude": 7, "max_magnitude": 3}, "min_magnitude"),
        ({"min_depth": 50, "max_depth": 10}, "min_depth"),
        ({"min_lat": 20, "max_lat": -20}, "min_lat"),
        ({"min_lon": 100, "max_lon": -100}, "min_lon"),
        (
            {"start_time": "2026-11-10T00:00:00Z", "end_time": "2026-11-01T00:00:00Z"},
            "start_time",
        ),
    ],
)
def test_inverted_ranges_return_400_validation_error(client, params, field):
    resp = client.get(URL, params=params)
    body = resp.json()
    assert resp.status_code == 400
    assert body["success"] is False
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert body["error"]["details"]["field"] == field


@pytest.mark.parametrize("field", ["start_time", "end_time"])
def test_malformed_time_returns_400(client, field):
    resp = client.get(URL, params={field: "hôm qua"})
    assert resp.status_code == 400
    assert resp.json()["error"]["details"]["field"] == field


def test_time_without_timezone_is_treated_as_utc(client, db):
    add_event(db, 1, event_time=datetime(2026, 11, 9, 10, 0, tzinfo=UTC))
    resp = client.get(
        URL,
        params={"start_time": "2026-11-09T09:00:00", "end_time": "2026-11-09T11:00:00"},
    )
    assert _ids(resp) == {"ev0001"}


# ---------- chi tiết 404 ----------
def test_detail_by_numeric_id(client, db):
    row = add_event(db, 1)
    resp = client.get(f"{URL}/{row.id}")
    assert resp.status_code == 200
    assert resp.json()["source_event_id"] == "ev0001"


def test_detail_by_source_event_id(client, db):
    add_event(db, 7)
    resp = client.get(f"{URL}/ev0007")
    assert resp.status_code == 200
    assert resp.json()["place"] == "Place 7"


def test_detail_missing_returns_404_resource_not_found(client):
    resp = client.get(f"{URL}/99999999")
    body = resp.json()
    assert resp.status_code == 404
    assert body["success"] is False
    assert body["error"]["code"] == "RESOURCE_NOT_FOUND"
    assert body["error"]["details"] == {"event_id": "99999999"}


# ---------- POST /sync ----------
class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


def _patch_usgs(monkeypatch, payload=None, error: Exception | None = None):
    class FakeClient:
        def __init__(self, *_args, **_kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *_exc):
            return False

        def get(self, _url):
            if error is not None:
                raise error
            return _FakeResponse(payload)

    monkeypatch.setattr(eq_routes.httpx, "Client", FakeClient)


def _feature(event_id: str, mag):
    return {
        "id": event_id,
        "properties": {
            "mag": mag,
            "time": 1_762_683_674_741,
            "place": "Test place",
            "magType": "ml",
            "url": "https://example.org/e",
        },
        "geometry": {"coordinates": [100.5, 10.5, 12.0]},
    }


def test_sync_inserts_new_events_and_skips_duplicates(client, db, monkeypatch):
    add_event(db, 1, source_event_id="us1")
    payload = {"features": [_feature("us1", 4.0), _feature("us2", 5.1)]}
    _patch_usgs(monkeypatch, payload)
    resp = client.post(f"{URL}/sync")
    assert resp.status_code == 200
    assert resp.json()["synced_count"] == 1
    assert client.get(URL).json()["metadata"]["total"] == 2


def test_sync_skips_features_without_magnitude(client, monkeypatch):
    payload = {"features": [_feature("us9", None)]}
    _patch_usgs(monkeypatch, payload)
    resp = client.post(f"{URL}/sync")
    assert resp.status_code == 200
    assert resp.json()["synced_count"] == 0


def test_sync_usgs_unreachable_returns_503_without_fake_success(client, monkeypatch):
    _patch_usgs(monkeypatch, error=httpx.ConnectError("không có mạng"))
    resp = client.post(f"{URL}/sync")
    body = resp.json()
    assert resp.status_code == 503
    assert body["success"] is False
    assert body["error"]["code"] == "DATA_SOURCE_UNAVAILABLE"
    assert client.get(URL).json()["metadata"]["total"] == 0


def test_sync_db_error_returns_500(broken_client, monkeypatch):
    _patch_usgs(monkeypatch, {"features": [_feature("us1", 4.0)]})
    resp = broken_client.post(f"{URL}/sync")
    assert resp.status_code == 500
    assert resp.json()["error"]["code"] == "DATABASE_ERROR"
