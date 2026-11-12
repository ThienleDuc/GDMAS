"""Upsert sự kiện địa chấn vào earthquake_events theo đặc tả docs/architecture/ERD.md §4.

INSERT ... ON CONFLICT (source, source_event_id) DO UPDATE ...
WHERE earthquake_events.source_updated_at IS NULL
   OR EXCLUDED.source_updated_at > earthquake_events.source_updated_at
"""

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from sqlalchemy import func, literal_column, or_
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from gdmas.models.earthquake import EarthquakeEvent

UPSERT_CONSTRAINT = "uq_earthquake_source_event"
UPDATABLE_COLUMNS: tuple[str, ...] = (
    "source_updated_at",
    "latitude",
    "longitude",
    "depth_km",
    "magnitude",
    "magnitude_type",
    "place",
    "source_url",
    "raw_data",
)
DEFAULT_CHUNK_SIZE = 500


@dataclass(frozen=True)
class UpsertStats:
    inserted: int = 0
    updated: int = 0
    unchanged: int = 0

    @property
    def processed(self) -> int:
        """Số bản ghi thực sự được ghi (chèn mới + cập nhật)."""
        return self.inserted + self.updated


def _row_key(row: dict[str, Any]) -> tuple[str, str]:
    return (row["source"], row["source_event_id"])


def _is_newer(candidate: dict[str, Any], current: dict[str, Any]) -> bool:
    cand_ts: datetime | None = candidate.get("source_updated_at")
    curr_ts: datetime | None = current.get("source_updated_at")
    if cand_ts is None:
        return False
    return curr_ts is None or cand_ts > curr_ts


def deduplicate_rows(rows: Sequence[dict[str, Any]]) -> list[dict[str, Any]]:
    """Gộp các dòng trùng (source, source_event_id) trong cùng batch, giữ bản source_updated_at mới nhất.

    PostgreSQL không cho ON CONFLICT DO UPDATE chạm cùng một dòng 2 lần trong 1 câu lệnh.
    """
    chosen: dict[tuple[str, str], dict[str, Any]] = {}
    for row in rows:
        key = _row_key(row)
        if key not in chosen or _is_newer(row, chosen[key]):
            chosen[key] = row
    return list(chosen.values())


def build_upsert_statement(rows: Sequence[dict[str, Any]]):
    """Tạo câu lệnh Upsert PostgreSQL; RETURNING cờ `inserted` (xmax = 0 khi là dòng mới)."""
    table = EarthquakeEvent.__table__
    stmt = pg_insert(table).values(list(rows))
    excluded = stmt.excluded

    set_: dict[str, Any] = {name: excluded[name] for name in UPDATABLE_COLUMNS}
    set_["ingested_at"] = func.now()

    return stmt.on_conflict_do_update(
        constraint=UPSERT_CONSTRAINT,
        set_=set_,
        where=or_(
            table.c.source_updated_at.is_(None),
            excluded.source_updated_at > table.c.source_updated_at,
        ),
    ).returning(literal_column("(xmax = 0)").label("inserted"))


def upsert_events(
    db: Session,
    rows: Sequence[dict[str, Any]],
    chunk_size: int = DEFAULT_CHUNK_SIZE,
) -> UpsertStats:
    """Upsert các dòng đã chuẩn hóa; không commit (caller quản lý transaction)."""
    unique_rows = deduplicate_rows(rows)
    if not unique_rows:
        return UpsertStats()

    inserted = 0
    updated = 0
    for start in range(0, len(unique_rows), chunk_size):
        chunk = unique_rows[start : start + chunk_size]
        for returned in db.execute(build_upsert_statement(chunk)):
            if returned.inserted:
                inserted += 1
            else:
                updated += 1

    unchanged = len(unique_rows) - inserted - updated
    return UpsertStats(inserted=inserted, updated=updated, unchanged=unchanged)
