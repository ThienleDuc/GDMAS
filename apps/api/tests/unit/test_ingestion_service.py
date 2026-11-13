"""Unit test offline cho IngestionService (testcase 2026-11-12-ingestion-upsert-validation-son).

HTTP được giả lập bằng httpx.MockTransport, DB bằng FakeSession — không gọi mạng USGS thật, không cần PostgreSQL.
"""

import httpx
import pytest

from gdmas.models.service_run import ServiceRun
from gdmas.services.ingestion import service as service_module
from gdmas.services.ingestion.service import (
    FALLBACK_FEED_URL,
    FeedUnavailableError,
    IngestionService,
    summarize_error,
)
from gdmas.services.ingestion.upsert import UpsertStats

PRIMARY_URL = (
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson"
)


def feature(event_id, coordinates=(142.38, 38.29, 24.5), mag=4.5):
    return {
        "type": "Feature",
        "id": event_id,
        "properties": {"mag": mag, "time": 1794355200000, "updated": 1794358800000},
        "geometry": {"type": "Point", "coordinates": list(coordinates)},
    }


class FakeQuery:
    def __init__(self, total):
        self.total = total

    def count(self):
        return self.total


class FakeSession:
    def __init__(self, total_in_db=0):
        self.added = []
        self.commits = 0
        self.rollbacks = 0
        self.closed = False
        self.total_in_db = total_in_db

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        self.closed = True
        return False

    def add(self, obj):
        self.added.append(obj)

    def commit(self):
        self.commits += 1

    def refresh(self, obj):
        obj.id = 1

    def rollback(self):
        self.rollbacks += 1

    def query(self, *_):
        return FakeQuery(self.total_in_db)

    @property
    def run(self) -> ServiceRun:
        runs = [obj for obj in self.added if isinstance(obj, ServiceRun)]
        assert len(runs) == 1
        return runs[0]


def make_transport(responses):
    """responses: dict url -> httpx.Response | Exception; ghi lại các URL đã gọi."""
    calls = []

    def handler(request: httpx.Request):
        url = str(request.url)
        calls.append(url)
        outcome = responses[url]
        if isinstance(outcome, Exception):
            raise outcome
        return outcome

    return httpx.MockTransport(handler), calls


@pytest.fixture
def captured_rows(monkeypatch):
    """Thay upsert_events bằng hàm giả: ghi lại các dòng và trả thống kê cố định."""
    captured = {}

    def fake_upsert(db, rows):
        captured["rows"] = list(rows)
        return captured.get("stats", UpsertStats(inserted=len(rows)))

    monkeypatch.setattr(service_module, "upsert_events", fake_upsert)
    return captured


def build_service(responses, session=None):
    transport, calls = make_transport(responses)
    session = session or FakeSession()
    svc = IngestionService(
        PRIMARY_URL, session_factory=lambda: session, http_transport=transport
    )
    return svc, session, calls


# TC-10
def test_successful_cycle_records_success_and_counts(captured_rows):
    captured_rows["stats"] = UpsertStats(inserted=1, updated=1, unchanged=0)
    payload = {
        "features": [feature("a"), feature("b"), feature("bad", coordinates=(500, 0))]
    }
    svc, session, calls = build_service(
        {PRIMARY_URL: httpx.Response(200, json=payload)}, FakeSession(total_in_db=10)
    )

    result = svc.execute_cycle()

    assert result["success"] is True
    assert result["new_records"] == 1
    assert result["updated"] == 1
    assert result["skipped_invalid"] == 1
    assert result["total_in_db"] == 10
    assert [r["source_event_id"] for r in captured_rows["rows"]] == ["a", "b"]
    assert session.run.status == "SUCCESS"
    assert session.run.records_processed == 2
    assert session.run.finished_at.tzinfo is not None
    assert calls == [PRIMARY_URL]
    assert session.closed


# TC-20 — BUG-son-001, BUG-son-002, BUG-son-003
def test_invalid_revisions_do_not_reach_upsert_or_fail_the_cycle(captured_rows):
    valid = feature("a")
    invalid_revision = feature("a", coordinates=(142.38, 38.29, "bad"))
    invalid_revision["properties"]["updated"] += 1
    payload = {
        "features": [
            valid,
            invalid_revision,
            feature("x" * 65),
            feature("overflow", mag=10**400),
            feature("b"),
        ]
    }
    svc, session, calls = build_service(
        {PRIMARY_URL: httpx.Response(200, json=payload)}
    )

    result = svc.execute_cycle()

    assert result["success"] is True
    assert result["inserted"] == 2
    assert result["skipped_invalid"] == 3
    assert [row["source_event_id"] for row in captured_rows["rows"]] == ["a", "b"]
    assert captured_rows["rows"][0]["depth_km"] == 24.5
    assert session.run.status == "SUCCESS"
    assert session.run.records_processed == 2
    assert session.rollbacks == 0
    assert calls == [PRIMARY_URL]
    assert session.closed


# TC-11
def test_http_503_on_both_urls_marks_run_failed(captured_rows):
    svc, session, calls = build_service(
        {PRIMARY_URL: httpx.Response(503), FALLBACK_FEED_URL: httpx.Response(503)}
    )

    result = svc.execute_cycle()

    assert result["success"] is False
    assert result["new_records"] == 0
    assert calls == [PRIMARY_URL, FALLBACK_FEED_URL]
    assert session.run.status == "FAILED"
    assert session.run.error_message.startswith("FeedUnavailableError")
    assert "503" in session.run.error_message
    assert len(session.run.error_message) <= 200
    assert session.rollbacks >= 1
    assert "rows" not in captured_rows


# TC-12
def test_timeout_marks_run_failed_without_raising(captured_rows):
    timeout = httpx.ConnectTimeout("timed out")
    svc, session, _ = build_service({PRIMARY_URL: timeout, FALLBACK_FEED_URL: timeout})

    result = svc.execute_cycle()

    assert result["success"] is False
    assert session.run.status == "FAILED"
    assert "ConnectTimeout" in session.run.error_message
    assert session.closed


# TC-13
def test_fallback_rescues_primary_failure(captured_rows):
    svc, session, calls = build_service(
        {
            PRIMARY_URL: httpx.Response(503),
            FALLBACK_FEED_URL: httpx.Response(200, json={"features": [feature("a")]}),
        }
    )

    result = svc.execute_cycle()

    assert result["success"] is True
    assert calls == [PRIMARY_URL, FALLBACK_FEED_URL]
    assert session.run.status == "SUCCESS"


# TC-14
def test_empty_feed_is_success_without_fake_rows(captured_rows):
    empty = httpx.Response(200, json={"type": "FeatureCollection", "features": []})
    svc, session, calls = build_service({PRIMARY_URL: empty, FALLBACK_FEED_URL: empty})

    result = svc.execute_cycle()

    assert result["success"] is True
    assert result["new_records"] == 0
    assert captured_rows["rows"] == []
    assert session.run.status == "SUCCESS"
    assert session.run.records_processed == 0
    assert calls == [PRIMARY_URL, FALLBACK_FEED_URL]


def test_empty_primary_with_broken_fallback_still_succeeds(captured_rows):
    svc, session, _ = build_service(
        {
            PRIMARY_URL: httpx.Response(200, json={"features": []}),
            FALLBACK_FEED_URL: httpx.Response(500),
        }
    )
    assert svc.execute_cycle()["success"] is True
    assert session.run.status == "SUCCESS"


# TC-15
@pytest.mark.parametrize(
    "bad_response",
    [
        httpx.Response(200, content=b"<html>not json</html>"),
        httpx.Response(200, json={"type": "FeatureCollection"}),
        httpx.Response(200, json=[1, 2, 3]),
    ],
)
def test_malformed_payload_is_treated_as_unavailable(captured_rows, bad_response):
    svc, session, _ = build_service(
        {PRIMARY_URL: bad_response, FALLBACK_FEED_URL: bad_response}
    )

    result = svc.execute_cycle()

    assert result["success"] is False
    assert session.run.status == "FAILED"


def test_unexpected_database_error_marks_failed(monkeypatch):
    def broken_upsert(db, rows):
        raise RuntimeError("connection lost")

    monkeypatch.setattr(service_module, "upsert_events", broken_upsert)
    svc, session, _ = build_service(
        {PRIMARY_URL: httpx.Response(200, json={"features": [feature("a")]})}
    )

    result = svc.execute_cycle()

    assert result["success"] is False
    assert session.run.status == "FAILED"
    assert session.run.error_message == "RuntimeError: connection lost"


def test_legacy_fetch_geojson_still_returns_empty_list_on_error():
    svc, _, _ = build_service({PRIMARY_URL: httpx.Response(502)})
    assert svc._fetch_geojson(PRIMARY_URL) == []
    with pytest.raises(FeedUnavailableError):
        svc._fetch_geojson_strict(PRIMARY_URL)


def test_legacy_save_feature_if_new_validates_and_upserts(captured_rows):
    svc, session, _ = build_service({})
    assert svc._save_feature_if_new(session, feature("a")) is True
    assert svc._save_feature_if_new(session, feature("bad", mag=None)) is False


# TC-16
def test_summarize_error_masks_credentials_and_truncates():
    exc = RuntimeError(
        "could not connect postgresql+psycopg://gdmas_user:topsecret@db:5432/gdmas "
        "url https://earthquake.usgs.gov/feed?api_key=abc " + "x" * 500
    )
    message = summarize_error(exc)

    assert message.startswith("RuntimeError: ")
    assert "topsecret" not in message
    assert "gdmas_user" not in message
    assert "api_key" not in message
    assert len(message) <= 200


def test_summarize_error_without_detail():
    assert summarize_error(TimeoutError()) == "TimeoutError"
