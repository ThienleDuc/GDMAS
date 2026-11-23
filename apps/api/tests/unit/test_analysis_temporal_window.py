"""Test offline: `/analysis/temporal` lọc 3 biểu đồ theo cửa sổ Ngày/Tuần/Tháng (2026-11-24)."""

from datetime import UTC, datetime

API = "/api/v1/analysis/temporal"
START = "2026-11-20T00:00:00Z"
END = "2026-11-24T00:00:00Z"


def _seed(db):
    from gdmas.models.earthquake import EarthquakeEvent

    for n, when, mag in (
        (1, datetime(2026, 11, 21, 1, tzinfo=UTC), 5.0),
        (2, datetime(2026, 11, 22, 2, tzinfo=UTC), 6.0),
        (3, datetime(2026, 11, 1, 3, tzinfo=UTC), 7.0),
    ):
        db.add(
            EarthquakeEvent(
                source="USGS",
                source_event_id=f"tmp_{n}",
                event_time=when,
                latitude=10.0,
                longitude=100.0,
                depth_km=10.0,
                magnitude=mag,
                magnitude_type="mb",
                place="Test",
                source_url=f"https://example.org/{n}",
            )
        )
    db.commit()


def test_window_uses_on_the_fly_data_for_all_three_charts(client, db):
    _seed(db)

    for interval in ("day", "week", "month"):
        body = client.get(
            API, params={"interval": interval, "start_time": START, "end_time": END}
        ).json()
        assert body["success"] is True, body
        data = body["data"]
        assert data["interval"] == interval
        assert data["stats"]["data_points"] == 2, (
            f"{interval}: chỉ 2 sự kiện trong cửa sổ"
        )
        assert data["scatter_plot"], f"{interval}: scatter phải có điểm mới"
        assert len(data["scatter_plot"]) == 2
        bins = data["histogram"]["magnitude_bins"]
        assert sum(int(bin_["count"]) for bin_ in bins) == 2, (
            f"{interval}: histogram phải khớp cửa sổ"
        )
        assert data["line_chart"], f"{interval}: line chart phải có điểm"


def test_no_window_and_no_filter_keeps_snapshot_path(client, db):
    """Không có cửa sổ & không filter → vẫn đi đường snapshot cũ, không crash."""
    _seed(db)
    resp = client.get(API, params={"interval": "day"})
    assert resp.status_code == 200
