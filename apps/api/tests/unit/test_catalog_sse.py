"""Test offline cho catalog realtime: dedupe, hash, SSE chỉ đẩy khi đổi (I7)."""

import asyncio
import json
from datetime import UTC, datetime, timedelta

from gdmas.models.earthquake import EarthquakeEvent
from gdmas.realtime import sse
from gdmas.services.catalog import (
    EMPTY_CATALOG,
    _count_rows,
    catalog_hash,
    catalog_payload,
    country_counts,
    region_counts,
)


def _event(db, n, when, country, region):
    db.add(
        EarthquakeEvent(
            source="USGS",
            source_event_id=f"cat_{n}",
            event_time=when,
            latitude=10.0,
            longitude=100.0,
            depth_km=10.0,
            magnitude=4.0,
            magnitude_type="mb",
            place="Test",
            source_url=f"https://example.org/{n}",
            country=country,
            region=region,
        )
    )
    db.commit()


class FakeRequest:
    def __init__(self, n):
        self.n = n

    async def is_disconnected(self):
        self.n -= 1
        return self.n < 0


def _state(total=5, new_run=None, **kw):
    state = {
        "success": True,
        "total": total,
        "strong_count": 0,
        "latest": None,
        "latest_run": None,
        "latest_run_id": 2 if new_run else 1,
        "max_id": 10,
        "new_events": [],
        "new_run_info": new_run,
    }
    state.update(kw)
    return state


def _collect(monkeypatch, states):
    sequence = iter(states)
    monkeypatch.setattr(sse, "get_latest_state", lambda *_a: next(sequence))
    monkeypatch.setattr(sse, "POLL_INTERVAL_SECONDS", 0)

    async def run():
        return [
            m
            async for m in sse.earthquake_event_generator(FakeRequest(len(states) - 1))
        ]

    return [json.loads(m["data"]) for m in asyncio.run(run())]


def test_tc01_count_rows_dedupes_case_and_whitespace():
    rows = [
        ("Honshu", 1),
        (" honshu ", 2),
        ("HONSHU", 3),
        ("Osaka", 4),
        ("", 9),
        (None, 9),
    ]
    result = _count_rows(rows, "region")
    assert result == [
        {"region": "Honshu", "count": 6},
        {"region": "Osaka", "count": 4},
    ]


def test_tc02_hash_stable_and_changes():
    a = {"countries": [{"country": "Japan", "count": 2}], "regions": []}
    b = json.loads(json.dumps(a))
    assert catalog_hash(a) == catalog_hash(b)
    b["countries"][0]["count"] = 3
    assert catalog_hash(a) != catalog_hash(b)


def test_tc03_sse_pushes_catalog_only_when_changed(monkeypatch):
    monkeypatch.setattr(sse, "_last_catalog_hash", None)
    catalog = {"countries": [{"country": "Japan", "count": 2}], "regions": []}
    monkeypatch.setattr(sse, "_catalog_snapshot", lambda: catalog)

    run = {"records_processed": 0, "finished_at": None}
    packets = _collect(
        monkeypatch, [_state(), _state(new_run=run), _state(new_run=run)]
    )
    cycles = [p for p in packets if p["event"] == "ingestion_cycle_completed"]

    assert len(cycles) == 2
    assert cycles[0]["data"]["catalog"] == catalog, "chu kỳ đầu phải có catalog"
    assert "catalog" not in cycles[1]["data"], "không đổi thì không gửi lại catalog"


def test_tc03_sse_pushes_again_after_data_change(monkeypatch):
    monkeypatch.setattr(sse, "_last_catalog_hash", None)
    first = {"countries": [{"country": "Japan", "count": 2}], "regions": []}
    second = {"countries": [{"country": "Japan", "count": 5}], "regions": []}
    snapshots = iter([first, second])
    monkeypatch.setattr(sse, "_catalog_snapshot", lambda: next(snapshots))

    run = {"records_processed": 1, "finished_at": None}
    packets = _collect(
        monkeypatch,
        [_state(), _state(new_run=run), _state(new_run=run, latest_run_id=3)],
    )
    cycles = [p for p in packets if p["event"] == "ingestion_cycle_completed"]

    assert cycles[0]["data"]["catalog"] == first
    assert cycles[1]["data"]["catalog"] == second


def test_tc08_catalog_uses_30_day_window_not_one_year(db):
    """Combobox chỉ đếm sự kiện trong cửa sổ 30 ngày, không dùng dữ liệu 1 năm cũ."""
    now = datetime.now(UTC)
    _event(db, 1, now - timedelta(days=5), "Japan", "Tokyo")
    _event(db, 2, now - timedelta(days=200), "Japan", "Osaka")
    assert country_counts(db, now=now, window_days=30) == [
        {"country": "Japan", "count": 1}
    ]
    assert region_counts(db, now=now, window_days=30) == [
        {"region": "Tokyo", "count": 1}
    ]


def test_tc09_sse_catalog_ignores_stale_env_365(db, monkeypatch):
    """Dù env shell còn export 365, catalog SSE vẫn dùng cửa sổ 30 ngày cố định."""
    from gdmas.core.config import settings

    monkeypatch.setattr(settings, "ANALYSIS_WINDOW_DAYS", 365)
    now = datetime.now(UTC)
    _event(db, 1, now - timedelta(days=5), "Japan", "Tokyo")
    _event(db, 2, now - timedelta(days=200), "Japan", "Osaka")

    payload = catalog_payload(db)
    assert payload == {
        "countries": [{"country": "Japan", "count": 1}],
        "regions": [{"region": "Tokyo", "count": 1}],
    }


def test_tc04_database_cleared_has_empty_catalog_and_resets_hash(monkeypatch):
    monkeypatch.setattr(sse, "_last_catalog_hash", "old-hash")
    packet = sse._cleared_packet()
    assert json.loads(packet["data"])["data"]["catalog"] == EMPTY_CATALOG
    sse.broadcast_database_cleared_event()
    assert sse._last_catalog_hash == catalog_hash(EMPTY_CATALOG)
