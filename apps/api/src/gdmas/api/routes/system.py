import logging
import time
from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy import desc, func, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from gdmas.api.errors import error_response
from gdmas.core.config import settings
from gdmas.db.connection import get_db
from gdmas.models.earthquake import EarthquakeEvent
from gdmas.models.service_run import ServiceRun
from gdmas.realtime.sse import _connected_sse_queues

logger = logging.getLogger(__name__)

router = APIRouter(tags=["System"])

API_VERSION = "1.0.0"
_STARTED_AT = time.monotonic()

# (khóa trong phản hồi, service_name trong service_runs, chu kỳ giây, nhãn chu kỳ)
_WORKERS = [
    ("data_ingestion", "ingestion", settings.INGESTION_INTERVAL_SECONDS, "5m"),
    ("data_analysis", "analysis", settings.ANALYSIS_INTERVAL_SECONDS, "5m"),
    ("clustering", "clustering", settings.CLUSTERING_INTERVAL_SECONDS, "1d"),
    ("prediction", "prediction", settings.PREDICTION_INTERVAL_SECONDS, "5m"),
]


def _iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _worker_status(run: ServiceRun | None, interval: int, now: datetime) -> str:
    """no_data: chưa có lần chạy; failed: lần chạy gần nhất lỗi;
    active: chạy gần đây (trong 2 chu kỳ); inactive: đã lâu không chạy."""
    if run is None:
        return "no_data"
    if run.status == "FAILED":
        return "failed"
    last = run.finished_at or run.started_at
    if last.tzinfo is None:
        last = last.replace(tzinfo=UTC)
    return "active" if (now - last).total_seconds() <= 2 * interval else "inactive"


@router.get("/health")
def health(db: Session = Depends(get_db)):
    """Kiểm tra Database API và kết nối PostgreSQL (truy vấn SELECT 1)."""
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        logger.error("Health check: mất kết nối CSDL: %s", exc)
        return error_response(
            "DATABASE_ERROR",
            "Không thể kết nối cơ sở dữ liệu.",
            500,
            details={"status": "unhealthy", "database": "disconnected"},
        )
    return {
        "success": True,
        "data": {
            "status": "healthy",
            "database": "connected",
            "version": API_VERSION,
            "timestamp": _iso(datetime.now(UTC)),
        },
    }


@router.get("/system/status")
def system_status(db: Session = Depends(get_db)):
    """Trạng thái 7 khối service và nguồn dữ liệu, đọc từ service_runs và earthquake_events."""
    now = datetime.now(UTC)
    try:
        db.execute(text("SELECT 1"))
        services: dict[str, dict] = {"postgres": {"status": "running"}}
        for key, name, interval, cycle in _WORKERS:
            run = (
                db.query(ServiceRun)
                .filter(ServiceRun.service_name == name)
                .order_by(desc(ServiceRun.id))
                .first()
            )
            services[key] = {
                "status": _worker_status(run, interval, now),
                "last_run": _iso(run.finished_at or run.started_at) if run else None,
                "last_run_status": run.status if run else None,
                "cycle": cycle,
            }
        total = db.query(func.count(EarthquakeEvent.id)).scalar() or 0
        latest = db.query(func.max(EarthquakeEvent.event_time)).scalar()
    except SQLAlchemyError as exc:
        logger.error("system/status: lỗi CSDL: %s", exc)
        return error_response(
            "DATABASE_ERROR", "Không thể truy vấn cơ sở dữ liệu.", 500, str(exc)
        )

    services["api"] = {
        "status": "active",
        "uptime_seconds": int(time.monotonic() - _STARTED_AT),
    }
    # Frontend được coi là "connected" khi có ít nhất một client đang mở kênh SSE
    services["frontend"] = {
        "status": "connected" if _connected_sse_queues else "disconnected",
        "sse_clients": len(_connected_sse_queues),
    }
    return {
        "success": True,
        "data": {
            "services": services,
            "data_feed": {
                "source": "USGS",
                "total_events": total,
                "latest_event_time": _iso(latest),
            },
        },
    }
