"""Phân cụm địa chấn DBSCAN thật cho Terminal 4 (docs/task/van.md Task 1–2).

Hàm `compute_dbscan` là thuần (scikit-learn, không I/O) để test offline; `run_cycle`
là phần duy nhất ghi DB. Không seed cụm giả, không đụng `main.py` (I1/I5).
Tọa độ WGS84, khoảng cách Haversine theo bán kính Trái Đất 6371.0088 km (I3).
"""

import logging
import math
from collections import Counter
from collections.abc import Mapping, Sequence
from datetime import UTC, datetime, timedelta
from typing import Any

import numpy as np
from sklearn.cluster import DBSCAN
from sqlalchemy.orm import Session

from gdmas.models.clustering import ClusteringEventMapping, ClusteringResult
from gdmas.models.earthquake import EarthquakeEvent
from gdmas.models.service_run import ServiceRun

logger = logging.getLogger("gdmas.services.clustering")

EARTH_RADIUS_KM = 6371.0088
DEFAULT_EPS_KM = 150.0
DEFAULT_MIN_SAMPLES = 5
DEFAULT_WINDOW_DAYS = 30


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Khoảng cách lớn vòng tròn giữa 2 điểm WGS84 (km)."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = phi2 - phi1
    dlambda = math.radians(lon2 - lon1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(min(a, 1.0)))


def _dominant_place(members: list[Mapping[str, Any]]) -> str | None:
    """Địa danh đại diện: cặp (region, country) phổ biến nhất, nếu không lấy place cuối."""
    pairs = Counter(
        (str(row.get("region") or "").strip(), str(row.get("country") or "").strip())
        for row in members
        if row.get("region") or row.get("country")
    )
    if pairs:
        (region, country), _ = pairs.most_common(1)[0]
        if region and country:
            return f"{region}, {country}"
        return region or country or None

    places = Counter(
        str(row["place"]).split(",")[-1].strip()
        for row in members
        if isinstance(row.get("place"), str) and row["place"].strip()
    )
    return places.most_common(1)[0][0] if places else None


def compute_dbscan(
    records: Sequence[Mapping[str, Any]],
    *,
    eps_km: float = DEFAULT_EPS_KM,
    min_samples: int = DEFAULT_MIN_SAMPLES,
) -> dict[str, Any]:
    """Tách danh sách sự kiện thành cụm DBSCAN; trả summary + mappings (thuần)."""
    parameters = {"eps_km": eps_km, "min_samples": min_samples, "metric": "haversine"}
    empty: dict[str, Any] = {
        "parameters": parameters,
        "total_clusters": 0,
        "noise_count": 0,
        "summary_clusters": [],
        "mappings": [],
    }
    if len(records) < min_samples:
        return empty

    latitudes = np.array([float(row["latitude"]) for row in records], dtype=float)
    longitudes = np.array([float(row["longitude"]) for row in records], dtype=float)
    # sklearn metric='haversine' nhận radian; eps cũng tính theo radian.
    radians = np.radians(np.column_stack([latitudes, longitudes]))
    labels = DBSCAN(
        eps=eps_km / EARTH_RADIUS_KM,
        min_samples=min_samples,
        metric="haversine",
        algorithm="ball_tree",
    ).fit_predict(radians)

    summary: list[dict[str, Any]] = []
    mappings: list[dict[str, Any]] = []
    for label in sorted({int(value) for value in labels if value >= 0}):
        indexes = [i for i, value in enumerate(labels) if int(value) == label]
        members = [records[i] for i in indexes]
        center_lat = float(latitudes[indexes].mean())
        lon_rad = np.radians(longitudes[indexes])
        center_lon = float(
            math.degrees(
                math.atan2(float(np.sin(lon_rad).mean()), float(np.cos(lon_rad).mean()))
            )
        )
        radius_km = max(
            (
                haversine_km(
                    center_lat,
                    center_lon,
                    float(row["latitude"]),
                    float(row["longitude"]),
                )
                for row in members
            ),
            default=0.0,
        )
        magnitudes = [
            float(row["magnitude"])
            for row in members
            if row.get("magnitude") is not None
        ]
        place = _dominant_place(members)
        summary.append(
            {
                "cluster_id": label,
                "center_latitude": round(center_lat, 6),
                "center_longitude": round(center_lon, 6),
                "event_count": len(members),
                "avg_magnitude": round(float(np.mean(magnitudes)), 2)
                if magnitudes
                else None,
                "max_magnitude": round(max(magnitudes), 2) if magnitudes else None,
                "radius_km": round(radius_km, 2),
                "name": place or f"Cluster {label}",
                "dominant_place": place,
            }
        )
        mappings.extend(
            {"event_id": int(row["id"]), "cluster_label": label} for row in members
        )

    noise = [i for i, value in enumerate(labels) if int(value) == -1]
    mappings.extend(
        {"event_id": int(records[i]["id"]), "cluster_label": -1} for i in noise
    )
    return {
        "parameters": parameters,
        "total_clusters": len(summary),
        "noise_count": len(noise),
        "summary_clusters": summary,
        "mappings": mappings,
    }


def run_cycle(
    db: Session,
    *,
    now: datetime | None = None,
    window_days: int = DEFAULT_WINDOW_DAYS,
    eps_km: float = DEFAULT_EPS_KM,
    min_samples: int = DEFAULT_MIN_SAMPLES,
) -> dict[str, Any]:
    """Một chu kỳ T4: đọc sự kiện → DBSCAN → ghi ServiceRun/result/mappings."""
    now = now or datetime.now(UTC)
    started = now
    run = ServiceRun(
        service_name="clustering",
        started_at=started,
        status="RUNNING",
        records_processed=0,
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    try:
        since = now - timedelta(days=window_days)
        rows = (
            db.query(
                EarthquakeEvent.id,
                EarthquakeEvent.latitude,
                EarthquakeEvent.longitude,
                EarthquakeEvent.magnitude,
                EarthquakeEvent.place,
                EarthquakeEvent.country,
                EarthquakeEvent.region,
            )
            .filter(EarthquakeEvent.event_time >= since)
            .order_by(EarthquakeEvent.id)
            .all()
        )
        records = [row._asdict() for row in rows]
        result = compute_dbscan(records, eps_km=eps_km, min_samples=min_samples)

        previous = db.query(ClusteringResult).order_by(ClusteringResult.id.desc()).all()
        for old in previous:
            db.delete(old)
        db.flush()

        saved = ClusteringResult(
            algorithm="DBSCAN",
            parameters=result["parameters"],
            total_clusters=result["total_clusters"],
            noise_count=result["noise_count"],
            summary_clusters={"clusters": result["summary_clusters"]},
            service_run_id=run.id,
        )
        db.add(saved)
        db.flush()
        db.bulk_save_objects(
            [
                ClusteringEventMapping(
                    cluster_result_id=saved.id,
                    event_id=item["event_id"],
                    cluster_label=item["cluster_label"],
                )
                for item in result["mappings"]
            ]
        )
        run.status = "SUCCESS"
        run.records_processed = len(records)
        run.finished_at = datetime.now(UTC)
        db.commit()
        return {**result, "events_processed": len(records)}
    except Exception as exc:  # noqa: BLE001 — worker không crash, ghi lỗi vào ServiceRun
        db.rollback()
        run.status = "FAILED"
        run.error_message = f"{type(exc).__name__}: {exc}"[:200]
        run.finished_at = datetime.now(UTC)
        db.commit()
        logger.error("[GDMAS-Clustering] Chu kỳ thất bại: %s", run.error_message)
        return {"success": False, "error": "CLUSTERING_FAILED"}
