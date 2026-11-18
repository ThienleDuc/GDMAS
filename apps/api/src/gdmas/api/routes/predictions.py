import logging

from fastapi import APIRouter, Depends
from sqlalchemy import desc
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from gdmas.api.errors import error_response
from gdmas.api.routes.system import _iso
from gdmas.db.connection import get_db
from gdmas.models.prediction import ClassificationResult, PredictionResult

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Predictions"])


def _empty(message: str) -> dict:
    """Bảng kết quả đang rỗng (chưa chạy hoặc đã bị xóa ở Demo Bước 2–3)."""
    return {"success": False, "data": None, "message": message}


@router.get("/predictions")
def get_latest_prediction(db: Session = Depends(get_db)):
    """Pattern 5: dự báo định lượng ngày kế tiếp (t+1) mới nhất."""
    try:
        row = (
            db.query(PredictionResult)
            .order_by(desc(PredictionResult.target_date), desc(PredictionResult.id))
            .first()
        )
    except SQLAlchemyError as exc:
        logger.error("Lỗi CSDL khi đọc prediction_results: %s", exc)
        return error_response(
            "DATABASE_ERROR",
            "Không thể truy vấn cơ sở dữ liệu.",
            500,
            type(exc).__name__,
        )
    if row is None:
        return _empty("Chưa có kết quả dự báo. Hãy chạy Terminal 5 (prediction).")
    return {
        "success": True,
        "data": {
            "target_date": row.target_date.isoformat(),
            "forecasted_metric": (
                "event_count"
                if row.metric_name == "daily_earthquake_count"
                else row.metric_name
            ),
            "predicted_value": row.predicted_value,
            "confidence_interval": {
                "lower": row.lower_bound,
                "upper": row.upper_bound,
            },
            "model_name": row.model_name,
            "model_version": row.model_version,
            "evaluation_metrics": row.evaluation_metrics or {},
            "generated_at": _iso(row.generated_at),
        },
    }


@router.get("/classifications")
def get_latest_classification(db: Session = Depends(get_db)):
    """Pattern 6: nhãn mức độ hoạt động địa chấn ngày kế tiếp (t+1) mới nhất."""
    try:
        row = (
            db.query(ClassificationResult)
            .order_by(
                desc(ClassificationResult.target_date), desc(ClassificationResult.id)
            )
            .first()
        )
    except SQLAlchemyError as exc:
        logger.error("Lỗi CSDL khi đọc classification_results: %s", exc)
        return error_response(
            "DATABASE_ERROR",
            "Không thể truy vấn cơ sở dữ liệu.",
            500,
            type(exc).__name__,
        )
    if row is None:
        return _empty("Chưa có kết quả phân loại. Hãy chạy Terminal 5 (prediction).")
    return {
        "success": True,
        "data": {
            "target_date": row.target_date.isoformat(),
            "predicted_label": row.predicted_label,
            "probabilities": row.probability_scores or {},
            "model_name": row.model_name,
            "model_version": row.model_version,
            "evaluation_metrics": row.evaluation_metrics or {},
            "generated_at": _iso(row.generated_at),
        },
    }
