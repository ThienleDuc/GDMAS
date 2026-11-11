"""PostgreSQL operations scoped exclusively to the four T3 snapshots."""

from collections.abc import Callable
from datetime import datetime

from sqlalchemy import delete, select, text
from sqlalchemy.orm import Session

from gdmas.models.analysis import AnalysisResult
from gdmas.models.earthquake import EarthquakeEvent

ANALYSIS_TYPES = ("time_series", "trend", "seasonality", "correlation")
# Stable PostgreSQL bigint key, shared by every new T3 worker in this database.
ANALYSIS_LOCK_KEY = 0x47444D415303


class AnalysisRepository:
    def __init__(self, session_factory: Callable[[], Session]):
        self.session_factory = session_factory

    @staticmethod
    def try_lock(session: Session) -> bool:
        return bool(
            session.scalar(
                text("SELECT pg_try_advisory_xact_lock(:key)"),
                {"key": ANALYSIS_LOCK_KEY},
            )
        )

    @staticmethod
    def read_events(
        session: Session, start: datetime | None, end: datetime
    ) -> list[dict]:
        query = select(
            EarthquakeEvent.id,
            EarthquakeEvent.event_time,
            EarthquakeEvent.magnitude,
            EarthquakeEvent.depth_km,
            EarthquakeEvent.latitude,
            EarthquakeEvent.longitude,
        ).where(EarthquakeEvent.event_time <= end)
        if start is not None:
            query = query.where(EarthquakeEvent.event_time >= start)
        return [
            dict(row)
            for row in session.execute(
                query.order_by(EarthquakeEvent.event_time, EarthquakeEvent.id)
            ).mappings()
        ]

    @staticmethod
    def replace_snapshot(
        session: Session, metrics: dict, *, start: datetime, end: datetime, run_id: int
    ) -> None:
        if metrics and set(metrics) != set(ANALYSIS_TYPES):
            raise ValueError(
                "Publishing requires all four T3 patterns or an empty snapshot"
            )
        session.execute(
            delete(AnalysisResult).where(
                AnalysisResult.analysis_type.in_(ANALYSIS_TYPES)
            )
        )
        session.add_all(
            [
                AnalysisResult(
                    analysis_type=kind,
                    time_interval="multi",
                    period_start=start,
                    period_end=end,
                    calculated_at=end,
                    metrics_data=payload,
                    service_run_id=run_id,
                )
                for kind, payload in metrics.items()
            ]
        )

    def record_failure(
        self, started_at: datetime, finished_at: datetime, processed: int, error: str
    ) -> None:
        from gdmas.models.service_run import ServiceRun

        with self.session_factory() as session, session.begin():
            session.add(
                ServiceRun(
                    service_name="analysis",
                    started_at=started_at,
                    finished_at=finished_at,
                    status="FAILED",
                    records_processed=processed,
                    error_message=error,
                )
            )
