"""Catalog quốc gia/khu vực dùng chung cho bộ lọc header và SSE (T6).

Chỉ đọc dữ liệu thật từ `EarthquakeEvent`, không mock, không ghi DB (I1/I5).
Gom biến thể cùng danh xưng theo khoá trim + casefold để mỗi khu vực chỉ có 1 dòng.
"""

import hashlib
import json
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from gdmas.core.config import settings
from gdmas.models.earthquake import EarthquakeEvent

# Combobox header luôn dùng cửa sổ 1 tháng cố định — KHÔNG phụ thuộc env ANALYSIS_WINDOW_DAYS.
# Lý do: môi trường có thể còn export giá trị cũ 365 → SSE đẩy catalog 1 năm ghi đè dữ liệu FE.
CATALOG_WINDOW_DAYS = 30


def _count_rows(rows: Any, field: str) -> list[dict[str, Any]]:
    """Gom `(label, count)` thành danh sách `{field: label, count}` đã dedupe/sort."""
    grouped: dict[str, dict[str, Any]] = {}
    for raw, count in rows:
        label = str(raw).strip() if raw is not None else ""
        if not label:
            continue
        key = label.casefold()
        entry = grouped.get(key)
        if entry is None:
            grouped[key] = {field: label, "count": int(count)}
        else:
            entry["count"] += int(count)
    return sorted(grouped.values(), key=lambda row: (-row["count"], row[field]))


def _window_since(window_days: int | None, now: datetime) -> datetime:
    """Cửa sổ mặc định lấy từ cấu hình (30 ngày) — không dùng dữ liệu 1 năm cũ."""
    days = window_days if window_days is not None else settings.ANALYSIS_WINDOW_DAYS
    return now - timedelta(days=days)


def country_counts(
    db: Session, *, window_days: int | None = None, now: datetime | None = None
) -> list[dict[str, Any]]:
    """Số sự kiện theo quốc gia trong cửa sổ cấu hình (bỏ NULL/rỗng)."""
    since = _window_since(window_days, now or datetime.now(UTC))
    rows = (
        db.query(EarthquakeEvent.country, func.count(EarthquakeEvent.id))
        .filter(
            EarthquakeEvent.country.is_not(None), EarthquakeEvent.event_time >= since
        )
        .group_by(EarthquakeEvent.country)
        .all()
    )
    return _count_rows(rows, "country")


def region_counts(
    db: Session, *, window_days: int | None = None, now: datetime | None = None
) -> list[dict[str, Any]]:
    """Số sự kiện theo khu vực trong cửa sổ cấu hình (bỏ NULL/rỗng)."""
    since = _window_since(window_days, now or datetime.now(UTC))
    rows = (
        db.query(EarthquakeEvent.region, func.count(EarthquakeEvent.id))
        .filter(
            EarthquakeEvent.region.is_not(None), EarthquakeEvent.event_time >= since
        )
        .group_by(EarthquakeEvent.region)
        .all()
    )
    return _count_rows(rows, "region")


def catalog_payload(db: Session) -> dict[str, list[dict[str, Any]]]:
    """Snapshot catalog gửi qua SSE — chỉ country/region/count, đúng cửa sổ 30 ngày."""
    now = datetime.now(UTC)
    return {
        "countries": country_counts(db, now=now, window_days=CATALOG_WINDOW_DAYS),
        "regions": region_counts(db, now=now, window_days=CATALOG_WINDOW_DAYS),
    }


def catalog_hash(payload: dict[str, Any]) -> str:
    """Hash ổn định để SSE chỉ đẩy catalog khi dữ liệu thực sự đổi."""
    serialized = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


EMPTY_CATALOG: dict[str, list[dict[str, Any]]] = {"countries": [], "regions": []}
