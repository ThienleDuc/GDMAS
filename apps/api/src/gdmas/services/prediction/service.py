"""Dịch vụ dự báo t+1: đọc số trận theo ngày từ DB, chạy mô hình, ghi prediction_results và
classification_results.

Quy ước: "t" là ngày UTC cuối cùng đã đủ 24 giờ dữ liệu (hôm qua), ngày dự báo là ngày UTC kế tiếp
(hôm nay). Kết quả cập nhật mỗi chu kỳ; sang ngày UTC mới thì ngày vừa qua được điền giá trị thực tế.
"""

import logging
from datetime import UTC, date, datetime, time, timedelta

from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from gdmas.db.connection import SessionLocal
from gdmas.models.earthquake import EarthquakeEvent
from gdmas.models.prediction import ClassificationResult, PredictionResult
from gdmas.models.service_run import ServiceRun
from gdmas.services.prediction import inference

logger = logging.getLogger("gdmas.services.prediction")
METRIC_NAME = "daily_earthquake_count"
MODEL_VERSION = "1.0.0"


class PredictionService:
    def execute_cycle(self) -> dict:
        started = datetime.now(UTC)
        try:
            with SessionLocal() as db:
                run = ServiceRun(service_name="prediction", status="RUNNING")
                db.add(run)
                db.commit()
                try:
                    result = self._predict(db, started)
                    run.status = "SUCCESS"
                    run.records_processed = 2
                except SQLAlchemyError:
                    db.rollback()
                    try:
                        run.status = "FAILED"
                        run.error_message = "DATABASE_ERROR"
                        run.finished_at = datetime.now(UTC)
                        db.commit()
                    except SQLAlchemyError:
                        db.rollback()
                    raise
                except (
                    Exception
                ) as exc:  # ghi lỗi vào service_runs, không làm sập runner
                    db.rollback()
                    logger.exception("Chu kỳ dự báo thất bại")
                    run.status = "FAILED"
                    run.error_message = str(exc)[:1000]
                    result = {"success": False, "error": str(exc)}
                run.finished_at = datetime.now(UTC)
                db.commit()
            return result
        except SQLAlchemyError:
            logger.exception("Mất kết nối CSDL trong chu kỳ dự báo")
            return {"success": False, "error": "DATABASE_ERROR"}

    # ---- đọc dữ liệu ----
    @staticmethod
    def _complete_day_counts(db: Session, today: date) -> dict[date, int]:
        """Số trận theo ngày UTC cho các ngày đã đủ dữ liệu (sau ngày có sự kiện đầu tiên, trước hôm nay)."""
        first_ts = db.scalar(select(func.min(EarthquakeEvent.event_time)))
        if first_ts is None:
            return {}
        first_complete = first_ts.astimezone(UTC).date() + timedelta(days=1)
        if first_complete >= today:
            return {}
        start = datetime.combine(first_complete, time.min, tzinfo=UTC)
        end = datetime.combine(today, time.min, tzinfo=UTC)
        day = func.date(func.timezone("UTC", EarthquakeEvent.event_time)).label("day")
        rows = db.execute(
            select(day, func.count())
            .where(
                EarthquakeEvent.event_time >= start, EarthquakeEvent.event_time < end
            )
            .group_by(day)
        ).all()
        return {r[0]: int(r[1]) for r in rows}

    # ---- chu kỳ chính ----
    def _predict(self, db: Session, now: datetime) -> dict:
        art = inference.load_artifacts()
        today = now.date()
        db_counts = self._complete_day_counts(db, today)
        series = inference.build_series(
            art["history"], db_counts, today - timedelta(days=1)
        )
        observed = int(series.notna().sum())

        fc = inference.forecast_next(series)
        cl = inference.classify_next(series)
        fc_name, fc_eval = inference.forecast_model_info()
        cl_name, cl_eval = inference.classifier_model_info()

        db.query(PredictionResult).filter(PredictionResult.target_date == today).delete(
            synchronize_session=False
        )
        db.query(ClassificationResult).filter(
            ClassificationResult.target_date == today
        ).delete(synchronize_session=False)
        db.add(
            PredictionResult(
                target_date=today,
                metric_name=METRIC_NAME,
                predicted_value=round(fc["predicted"], 3),
                lower_bound=round(fc["lower"], 3),
                upper_bound=round(fc["upper"], 3),
                model_name=fc_name[:64],
                model_version=MODEL_VERSION,
                evaluation_metrics={**fc_eval, "history_days_observed": observed},
            )
        )
        db.add(
            ClassificationResult(
                target_date=today,
                predicted_label=cl["label"],
                probability_scores=cl["probabilities"],
                model_name=cl_name[:64],
                model_version=MODEL_VERSION,
                evaluation_metrics=cl_eval,
            )
        )

        self._fill_actuals(db, db_counts, today)
        db.commit()
        logger.info(
            "Dự báo %s: %.1f [%.1f - %.1f] | rủi ro %s",
            today,
            fc["predicted"],
            fc["lower"],
            fc["upper"],
            cl["label"],
        )
        return {
            "success": True,
            "target_date": today.isoformat(),
            "predicted": fc["predicted"],
            "lower": fc["lower"],
            "upper": fc["upper"],
            "label": cl["label"],
            "probabilities": cl["probabilities"],
            "history_days_observed": observed,
        }

    @staticmethod
    def _fill_actuals(db: Session, db_counts: dict[date, int], today: date) -> None:
        """Điền giá trị thực tế cho các dự báo của những ngày đã kết thúc (nếu DB có đủ dữ liệu ngày đó)."""
        for row in db.query(PredictionResult).filter(
            PredictionResult.target_date < today,
            PredictionResult.actual_value.is_(None),
        ):
            if row.target_date in db_counts:
                row.actual_value = float(db_counts[row.target_date])
        for row in db.query(ClassificationResult).filter(
            ClassificationResult.target_date < today,
            ClassificationResult.actual_label.is_(None),
        ):
            if row.target_date in db_counts:
                row.actual_label = inference.label_of_count(db_counts[row.target_date])
