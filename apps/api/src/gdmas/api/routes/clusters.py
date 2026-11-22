import logging

from fastapi import APIRouter, Depends
from sqlalchemy import desc
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from gdmas.api.errors import error_response
from gdmas.api.routes.predictions import _empty
from gdmas.api.routes.system import _iso
from gdmas.db.connection import get_db
from gdmas.models.clustering import ClusteringResult

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Clustering"])


def _cluster(c: dict) -> dict:
    """Chuẩn hóa về tên trường canonical của contract FE (nhận alias legacy).

    Bổ sung field optional đã có trong ``contracts/schemas/clusters.json``:
    ``radius_km``, ``dominant_place``. FE ``normalizeClusters()`` / ``groupClustersByCountry()``
    đọc trực tiếp ``dominant_place`` — thiếu field này mọi cụm thật rơi vào nhóm "Khác"
    (GAP-01). Giữ nguyên chữ ký và 6 key cũ (RULE-03); field thiếu → ``None`` (không bịa số).
    """
    return {
        "cluster_id": c.get("cluster_id", c.get("id")),
        "center_latitude": c.get("center_latitude", c.get("lat")),
        "center_longitude": c.get("center_longitude", c.get("lon")),
        "event_count": c.get("event_count", c.get("events_count")),
        "avg_magnitude": c.get("avg_magnitude", c.get("avg_mag")),
        "max_magnitude": c.get("max_magnitude", c.get("max_mag")),
        "radius_km": c.get("radius_km", c.get("radius")),
        "name": c.get("name"),
        "dominant_place": c.get("dominant_place", c.get("place")),
    }


@router.get("/clusters")
def get_clusters(db: Session = Depends(get_db)):
    """Kết quả phân cụm DBSCAN mới nhất."""
    try:
        row = db.query(ClusteringResult).order_by(desc(ClusteringResult.id)).first()
    except SQLAlchemyError as exc:
        logger.error("Lỗi CSDL khi đọc clustering_results: %s", exc)
        return error_response(
            "DATABASE_ERROR",
            "Không thể truy vấn cơ sở dữ liệu.",
            500,
            type(exc).__name__,
        )
    if row is None:
        return _empty("Chưa có kết quả phân cụm. Hãy chạy Terminal 4 (clustering).")
    clusters = (row.summary_clusters or {}).get("clusters", [])
    return {
        "success": True,
        "data": {
            "algorithm": row.algorithm,
            "parameters": row.parameters,
            "clusters_count": row.total_clusters,
            "noise_count": row.noise_count,
            "calculated_at": _iso(row.calculated_at),
            "clusters": [_cluster(c) for c in clusters],
        },
    }
