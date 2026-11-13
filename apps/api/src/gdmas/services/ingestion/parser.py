"""Chuẩn hóa và kiểm tra hợp lệ GeoJSON feature từ USGS trước khi lưu (Terminal 2).

Các hàm trong module này là hàm thuần (không I/O) để kiểm thử offline.
"""

import logging
import math
from collections.abc import Iterable
from datetime import UTC, datetime
from typing import Any

logger = logging.getLogger("gdmas.services.ingestion.parser")

SOURCE_USGS = "USGS"
SOURCE_EVENT_ID_MAX_LEN = 64

LATITUDE_RANGE = (-90.0, 90.0)
LONGITUDE_RANGE = (-180.0, 180.0)


def to_finite_float(value: Any) -> float | None:
    """Ép về float hữu hạn; trả None với None, bool, chuỗi không phải số, NaN hoặc ±inf."""
    if value is None or isinstance(value, bool):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError, OverflowError):
        return None
    return number if math.isfinite(number) else None


def epoch_ms_to_utc(value: Any) -> datetime | None:
    """Chuyển epoch milliseconds (định dạng USGS) sang datetime mang timezone.utc."""
    millis = to_finite_float(value)
    if millis is None:
        return None
    try:
        return datetime.fromtimestamp(millis / 1000.0, tz=UTC)
    except (OverflowError, OSError, ValueError):
        return None


def _in_range(value: float, bounds: tuple[float, float]) -> bool:
    return bounds[0] <= value <= bounds[1]


def _reject(event_id: Any, reason: str) -> None:
    logger.warning(
        "[GDMAS-Ingestion] Bỏ qua feature %s: %s", event_id or "<không có id>", reason
    )


def parse_feature(feat: Any) -> dict[str, Any] | None:
    """Chuẩn hóa 1 GeoJSON feature thành dict cột của bảng earthquake_events.

    Trả None (kèm log cảnh báo) khi feature không hợp lệ:
    thiếu id, thiếu/không hợp lệ tọa độ WGS84, magnitude không phải số hữu hạn, hoặc thiếu thời điểm.
    """
    if not isinstance(feat, dict):
        _reject(None, "feature không phải object JSON")
        return None

    props = feat.get("properties") or {}
    geom = feat.get("geometry") or {}
    if not isinstance(props, dict) or not isinstance(geom, dict):
        _reject(feat.get("id"), "properties/geometry không hợp lệ")
        return None

    event_id = feat.get("id") or props.get("code")
    if not event_id:
        _reject(None, "thiếu id sự kiện")
        return None
    event_id = str(event_id)
    if len(event_id) > SOURCE_EVENT_ID_MAX_LEN:
        _reject(event_id, "id sự kiện vượt quá giới hạn 64 ký tự")
        return None

    coords = geom.get("coordinates")
    if not isinstance(coords, (list, tuple)) or len(coords) < 2:
        _reject(event_id, "thiếu tọa độ")
        return None

    longitude = to_finite_float(coords[0])
    latitude = to_finite_float(coords[1])
    if longitude is None or latitude is None:
        _reject(event_id, "tọa độ không phải số hữu hạn")
        return None
    if not _in_range(latitude, LATITUDE_RANGE) or not _in_range(
        longitude, LONGITUDE_RANGE
    ):
        _reject(event_id, f"tọa độ ngoài chuẩn WGS84 (lat={latitude}, lon={longitude})")
        return None

    depth_km = 0.0
    if len(coords) > 2:
        depth_km = to_finite_float(coords[2])
        if depth_km is None:
            _reject(event_id, "độ sâu không phải số hữu hạn")
            return None

    magnitude = to_finite_float(props.get("mag"))
    if magnitude is None:
        _reject(event_id, f"magnitude không hợp lệ ({props.get('mag')!r})")
        return None

    event_time = epoch_ms_to_utc(props.get("time"))
    if event_time is None:
        _reject(event_id, "thiếu hoặc sai thời điểm sự kiện (time)")
        return None

    return {
        "source": SOURCE_USGS,
        "source_event_id": event_id,
        "event_time": event_time,
        "source_updated_at": epoch_ms_to_utc(props.get("updated")),
        "latitude": latitude,
        "longitude": longitude,
        "depth_km": depth_km,
        "magnitude": magnitude,
        "magnitude_type": props.get("magType"),
        "place": props.get("place"),
        "source_url": props.get("url"),
        "raw_data": feat,
    }


def parse_features(features: Iterable[Any]) -> tuple[list[dict[str, Any]], int]:
    """Chuẩn hóa danh sách feature; trả (các dòng hợp lệ, số feature bị loại)."""
    rows: list[dict[str, Any]] = []
    skipped = 0
    for feat in features or []:
        row = parse_feature(feat)
        if row is None:
            skipped += 1
        else:
            rows.append(row)
    return rows, skipped
