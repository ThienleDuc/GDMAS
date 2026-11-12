"""Unit test offline cho gdmas.services.ingestion.upsert (testcase 2026-11-12-ingestion-upsert-validation-son)."""

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

from sqlalchemy.dialects import postgresql

from gdmas.services.ingestion.upsert import (
    UPDATABLE_COLUMNS,
    UpsertStats,
    build_upsert_statement,
    deduplicate_rows,
    upsert_events,
)

BASE_TIME = datetime(2026, 11, 10, tzinfo=UTC)


def make_row(event_id="us1", updated_offset_h=0, magnitude=4.0):
    return {
        "source": "USGS",
        "source_event_id": event_id,
        "event_time": BASE_TIME,
        "source_updated_at": None
        if updated_offset_h is None
        else BASE_TIME + timedelta(hours=updated_offset_h),
        "latitude": 38.29,
        "longitude": 142.38,
        "depth_km": 24.5,
        "magnitude": magnitude,
        "magnitude_type": "mww",
        "place": "Honshu",
        "source_url": "https://earthquake.usgs.gov/x",
        "raw_data": {"id": event_id},
    }


def compile_sql(stmt) -> str:
    return " ".join(str(stmt.compile(dialect=postgresql.dialect())).split())


# TC-07
def test_upsert_statement_matches_erd_strategy():
    sql = compile_sql(build_upsert_statement([make_row()]))

    assert sql.startswith("INSERT INTO earthquake_events")
    assert "ON CONFLICT ON CONSTRAINT uq_earthquake_source_event DO UPDATE SET" in sql
    for column in UPDATABLE_COLUMNS:
        assert f"{column} = excluded.{column}" in sql
    assert "ingested_at = now()" in sql
    assert (
        "WHERE earthquake_events.source_updated_at IS NULL "
        "OR excluded.source_updated_at > earthquake_events.source_updated_at"
    ) in sql
    assert "RETURNING (xmax = 0) AS inserted" in sql


def test_upsert_does_not_overwrite_identity_columns():
    sql = compile_sql(build_upsert_statement([make_row()]))
    set_clause = sql.split("DO UPDATE SET", 1)[1].split("WHERE", 1)[0]
    assert "source_event_id =" not in set_clause
    assert "event_time =" not in set_clause


def test_upsert_statement_supports_multiple_rows():
    sql = compile_sql(build_upsert_statement([make_row("a"), make_row("b")]))
    assert sql.count("VALUES") == 1
    assert "), (" in sql


# TC-08
def test_deduplicate_keeps_newest_source_updated_at():
    rows = [
        make_row("a", 1, 4.0),
        make_row("b", 0),
        make_row("a", 3, 4.5),
        make_row("a", 2, 4.2),
    ]
    result = deduplicate_rows(rows)
    assert [r["source_event_id"] for r in result] == ["a", "b"]
    assert result[0]["magnitude"] == 4.5


def test_deduplicate_prefers_timestamp_over_none():
    assert (
        deduplicate_rows([make_row("a", None, 1.0), make_row("a", 1, 2.0)])[0][
            "magnitude"
        ]
        == 2.0
    )
    assert (
        deduplicate_rows([make_row("a", 1, 2.0), make_row("a", None, 1.0)])[0][
            "magnitude"
        ]
        == 2.0
    )


class FakeDb:
    def __init__(self, returned_flags):
        self.returned_flags = list(returned_flags)
        self.statements = []

    def execute(self, stmt):
        self.statements.append(stmt)
        flags, self.returned_flags = self.returned_flags, []
        return [SimpleNamespace(inserted=flag) for flag in flags]


# TC-09
def test_upsert_events_counts_inserted_updated_unchanged():
    db = FakeDb(
        [True, False]
    )  # 1 dòng mới, 1 dòng cập nhật, dòng thứ 3 bị WHERE chặn (không RETURNING)
    stats = upsert_events(db, [make_row("a"), make_row("b"), make_row("c")])

    assert stats == UpsertStats(inserted=1, updated=1, unchanged=1)
    assert stats.processed == 2
    assert len(db.statements) == 1


def test_upsert_events_empty_batch_skips_database():
    db = FakeDb([])
    assert upsert_events(db, []) == UpsertStats()
    assert db.statements == []


def test_upsert_events_chunks_large_batches():
    db = FakeDb([])
    rows = [make_row(f"id{i}") for i in range(5)]
    stats = upsert_events(db, rows, chunk_size=2)
    assert len(db.statements) == 3
    assert stats.unchanged == 5
