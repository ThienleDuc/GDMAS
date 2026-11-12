"""Dịch vụ phân tích 4 Patterns chuỗi thời gian cho Terminal 3 (Analysis).

Mỗi chu kỳ: ServiceRun(RUNNING) → đọc earthquake_events trong cửa sổ phân tích → tính Pattern 1–4 →
thay toàn bộ snapshot analysis_results trong 1 transaction → ServiceRun(SUCCESS | FAILED).

Quy ước ghi analysis_results (giữ tương thích GET /api/v1/patterns):
- Pattern 1 (endpoint `temporal`) → analysis_type `time_series`, time_interval `day` | `week` | `month`
- Pattern 2 → `trend`, Pattern 3 → `seasonality`, Pattern 4 → `correlation`
"""

import logging
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

import pandas as pd
from sqlalchemy.orm import Session

from gdmas.db.connection import SessionLocal
from gdmas.models.analysis import AnalysisResult
from gdmas.models.earthquake import EarthquakeEvent
from gdmas.models.service_run import ServiceRun
from gdmas.services.analysis.patterns import (
    build_analysis_snapshot,
    prepare_events,
)

logger = logging.getLogger("gdmas.services.analysis")

SERVICE_NAME = "analysis"
DEFAULT_WINDOW_DAYS = 365
ERROR_MESSAGE_MAX_LEN = 200


def _short_error(exc: BaseException) -> str:
    detail = " ".join(str(exc).split())
    message = f"{type(exc).__name__}: {detail}" if detail else type(exc).__name__
    return (
        message
        if len(message) <= ERROR_MESSAGE_MAX_LEN
        else message[: ERROR_MESSAGE_MAX_LEN - 1] + "…"
    )


class AnalysisService:
    def __init__(
        self,
        *,
        session_factory: Callable[[], Session] | None = None,
        window_days: int = DEFAULT_WINDOW_DAYS,
    ):
        self._session_factory = session_factory or SessionLocal
        self.window_days = window_days

    def _load_events(self, db: Session, since: datetime) -> pd.DataFrame:
        """Đọc sự kiện từ earthquake_events kể từ `since` (UTC)."""
        rows = (
            db.query(
                EarthquakeEvent.id,
                EarthquakeEvent.event_time,
                EarthquakeEvent.magnitude,
                EarthquakeEvent.depth_km,
                EarthquakeEvent.latitude,
                EarthquakeEvent.longitude,
            )
            .filter(EarthquakeEvent.event_time >= since)
            .order_by(EarthquakeEvent.event_time)
            .all()
        )
        return prepare_events(row._asdict() for row in rows)

    def execute_cycle(self) -> dict[str, Any]:
        """Chạy 1 chu kỳ phân tích. Không ném ngoại lệ ra ngoài: lỗi được ghi FAILED vào service_runs."""
        start_time = datetime.now(UTC)
        run_record = None

        with self._session_factory() as db:
            try:
                run_record = ServiceRun(
                    service_name=SERVICE_NAME,
                    started_at=start_time,
                    status="RUNNING",
                    records_processed=0,
                )
                db.add(run_record)
                db.commit()
                db.refresh(run_record)

                since = start_time - timedelta(days=self.window_days)
                events = prepare_events(self._load_events(db, since))
                snapshot = build_analysis_snapshot(events)

                # Thay snapshot cũ; DB rỗng thì chỉ xóa, không chèn số liệu giả.
                db.query(AnalysisResult).delete(synchronize_session=False)
                calculated_at = datetime.now(UTC)
                for item in snapshot:
                    db.add(
                        AnalysisResult(
                            analysis_type=item["analysis_type"],
                            time_interval=item["time_interval"],
                            period_start=item["period_start"],
                            period_end=item["period_end"],
                            metrics_data=item["metrics_data"],
                            calculated_at=calculated_at,
                            service_run_id=run_record.id,
                        )
                    )

                finish_time = datetime.now(UTC)
                run_record.status = "SUCCESS"
                run_record.records_processed = len(events)
                run_record.finished_at = finish_time
                db.commit()

                duration_sec = (finish_time - start_time).total_seconds()
                if events.empty:
                    logger.info(
                        "[GDMAS-Analysis] CSDL trống trong cửa sổ phân tích — đã xóa snapshot cũ, không ghi kết quả."
                    )
                else:
                    logger.info(
                        f"[GDMAS-Analysis] Hoàn thành chu kỳ ({duration_sec:.2f}s): "
                        f"{len(events)} sự kiện → {len(snapshot)} bản ghi analysis_results"
                    )
                return {
                    "success": True,
                    "events_analyzed": len(events),
                    "results_written": len(snapshot),
                    "analysis_types": [
                        f"{item['analysis_type']}:{item['time_interval']}"
                        for item in snapshot
                    ],
                    "service_run_id": run_record.id,
                    "duration_seconds": duration_sec,
                    "timestamp": finish_time.isoformat(),
                }

            except Exception as exc:  # noqa: BLE001 — worker không được crash; lỗi ghi vào service_runs
                db.rollback()
                finish_time = datetime.now(UTC)
                error_msg = _short_error(exc)
                logger.error(
                    f"[GDMAS-Analysis] Lỗi trong chu kỳ phân tích: {error_msg}"
                )

                if run_record is not None:
                    try:
                        run_record.status = "FAILED"
                        run_record.finished_at = finish_time
                        run_record.error_message = error_msg
                        db.commit()
                    except Exception:  # noqa: BLE001 — cố ghi FAILED, lỗi phụ thì rollback
                        db.rollback()

                return {
                    "success": False,
                    "error": error_msg,
                    "events_analyzed": 0,
                    "results_written": 0,
                    "timestamp": finish_time.isoformat(),
                }
