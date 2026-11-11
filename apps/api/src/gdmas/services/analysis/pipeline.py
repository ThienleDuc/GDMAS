"""Compute once, validate all metrics, then atomically publish four snapshots."""

import logging
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from time import perf_counter

from sqlalchemy.orm import Session

from gdmas.models.service_run import ServiceRun
from gdmas.schemas.analysis_metrics import AnalysisPatterns
from gdmas.services.analysis.correlation import compute_correlation
from gdmas.services.analysis.decomposition import compute_seasonality, compute_trend
from gdmas.services.analysis.preprocessing import PreparedData, prepare_events
from gdmas.services.analysis.repository import AnalysisRepository
from gdmas.services.analysis.statistical import compute_statistics

logger = logging.getLogger(__name__)


def compute_patterns(data: PreparedData) -> dict:
    return AnalysisPatterns.model_validate(
        {
            "time_series": compute_statistics(data),
            "trend": compute_trend(data),
            "seasonality": compute_seasonality(data),
            "correlation": compute_correlation(data),
        }
    ).json_metrics()


class AnalysisPipeline:
    def __init__(
        self,
        session_factory: Callable[[], Session] | None = None,
        *,
        lookback_days: int | None = None,
    ):
        if lookback_days is not None and lookback_days <= 0:
            raise ValueError("lookback_days must be positive")
        if session_factory is None:
            from gdmas.db.connection import SessionLocal

            session_factory = SessionLocal
        self.repository = AnalysisRepository(session_factory)
        self.lookback_days = lookback_days

    def execute_cycle(self, *, computed_at: datetime | None = None) -> dict:
        started_at = computed_at or datetime.now(UTC)
        if started_at.tzinfo is None:
            raise ValueError("computed_at must be timezone-aware")
        started_at = started_at.astimezone(UTC)
        timer = perf_counter()
        processed = 0
        try:
            with self.repository.session_factory() as session, session.begin():
                if not self.repository.try_lock(session):
                    return {
                        "success": True,
                        "skipped": True,
                        "reason": "analysis_locked",
                    }
                run = ServiceRun(
                    service_name="analysis",
                    started_at=started_at,
                    status="RUNNING",
                    records_processed=0,
                )
                session.add(run)
                session.flush()
                start = (
                    started_at - timedelta(days=self.lookback_days)
                    if self.lookback_days
                    else None
                )
                events = self.repository.read_events(session, start, started_at)
                processed = len(events)
                data = prepare_events(
                    events, computed_at=started_at, lookback_days=self.lookback_days
                )
                metrics = compute_patterns(data) if not data.frame.empty else {}
                self.repository.replace_snapshot(
                    session, metrics, start=data.start, end=data.end, run_id=run.id
                )
                run.status = "SUCCESS"
                run.records_processed = processed
                run.finished_at = datetime.now(UTC)
            duration = perf_counter() - timer
            logger.info(
                "Analysis cycle succeeded: events=%s patterns=%s duration=%.3fs",
                processed,
                len(metrics),
                duration,
            )
            return {
                "success": True,
                "skipped": False,
                "records_processed": processed,
                "analysis_records": len(metrics),
                "duration_seconds": duration,
            }
        except Exception as error:  # noqa: BLE001 -- cycle boundary must preserve the worker
            # Driver messages may contain SQL parameters or a connection URI.
            # Persist/log the exception class only, never credentials or event payloads.
            error_code = type(error).__name__
            logger.error("Analysis cycle failed: %s", error_code)
            try:
                self.repository.record_failure(
                    started_at, datetime.now(UTC), processed, error_code
                )
            except Exception as log_error:  # noqa: BLE001 -- failure logging is best effort
                logger.error(
                    "Cannot persist analysis failure: %s", type(log_error).__name__
                )
            return {
                "success": False,
                "error": error_code,
                "records_processed": processed,
                "duration_seconds": perf_counter() - timer,
            }
