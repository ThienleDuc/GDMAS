from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from gdmas.db.connection import get_db
from gdmas.models.analysis import AnalysisResult
from gdmas.models.clustering import ClusteringResult
from gdmas.models.prediction import PredictionResult, ClassificationResult

router = APIRouter(prefix="/patterns", tags=["Patterns"])


@router.get("")
def get_all_patterns(db: Session = Depends(get_db)):
    """
    Trả về dữ liệu chi tiết của 6 Patterns chuỗi thời gian & không gian từ CSDL.
    Nếu CSDL bị xóa trống (Bước 2 Demo), trả về trạng thái rỗng để Web phản hồi lỗi chính xác.
    """
    analysis_records = db.query(AnalysisResult).all()
    clustering_record = db.query(ClusteringResult).order_by(desc(ClusteringResult.id)).first()
    prediction_record = db.query(PredictionResult).order_by(desc(PredictionResult.id)).first()
    classification_record = db.query(ClassificationResult).order_by(desc(ClassificationResult.id)).first()

    has_data = bool(analysis_records or clustering_record or prediction_record or classification_record)

    if not has_data:
        return {
            "success": False,
            "total_patterns": 0,
            "patterns": [],
            "message": "CSDL TRỐNG: Chưa có dữ liệu 6 patterns. Hãy chạy .\\scripts\\demo-init-patterns.ps1 để khởi tạo!",
        }

    # Bóc tách từng pattern từ CSDL
    patterns_list = []

    # 1. Pattern 1: Time-Series & Histogram
    p1 = next((a for a in analysis_records if a.analysis_type == "time_series"), None)
    patterns_list.append({
        "id": "pattern_1",
        "name": "Biểu diễn theo thời gian (Line, Scatter, Histogram)",
        "type": "time_series",
        "status": "COMPUTED" if p1 else "PENDING",
        "metrics": p1.metrics_data if p1 else {},
        "period": "Hourly / Daily / Monthly",
    })

    # 2. Pattern 2: Trend Analysis sau Re-sampling
    p2 = next((a for a in analysis_records if a.analysis_type == "trend"), None)
    patterns_list.append({
        "id": "pattern_2",
        "name": "Trend Analysis (Đường xu hướng sau Re-sampling)",
        "type": "trend",
        "status": "COMPUTED" if p2 else "PENDING",
        "metrics": p2.metrics_data if p2 else {},
        "period": "Weekly / Monthly",
    })

    # 3. Pattern 3: Seasonality sau Re-sampling
    p3 = next((a for a in analysis_records if a.analysis_type == "seasonality"), None)
    patterns_list.append({
        "id": "pattern_3",
        "name": "Seasonality (Tính chu kỳ mùa vụ)",
        "type": "seasonality",
        "status": "COMPUTED" if p3 else "PENDING",
        "metrics": p3.metrics_data if p3 else {},
        "period": "Monthly",
    })

    # 4. Pattern 4: Correlation Matrix đa biến
    p4 = next((a for a in analysis_records if a.analysis_type == "correlation"), None)
    patterns_list.append({
        "id": "pattern_4",
        "name": "Correlation Matrix (Ma trận tương quan đa biến)",
        "type": "correlation",
        "status": "COMPUTED" if p4 else "PENDING",
        "metrics": p4.metrics_data if p4 else {},
        "period": "Daily",
    })

    # 5. Pattern 5: Dự báo định lượng t+1
    patterns_list.append({
        "id": "pattern_5",
        "name": "Dự báo định lượng ngày kế tiếp (t+1)",
        "type": "prediction",
        "status": "COMPUTED" if prediction_record else "PENDING",
        "metrics": {
            "target_date": prediction_record.target_date.isoformat() if prediction_record else None,
            "predicted_value": prediction_record.predicted_value if prediction_record else 0.0,
            "lower_bound": prediction_record.lower_bound if prediction_record else 0.0,
            "upper_bound": prediction_record.upper_bound if prediction_record else 0.0,
            "model_name": prediction_record.model_name if prediction_record else None,
        } if prediction_record else {},
        "period": "Day t+1",
    })

    # 6. Pattern 6: Phân loại rủi ro t+1
    patterns_list.append({
        "id": "pattern_6",
        "name": "Phân loại mức độ hoạt động ngày kế tiếp (t+1)",
        "type": "classification",
        "status": "COMPUTED" if classification_record else "PENDING",
        "metrics": {
            "target_date": classification_record.target_date.isoformat() if classification_record else None,
            "predicted_label": classification_record.predicted_label if classification_record else None,
            "probability_scores": classification_record.probability_scores if classification_record else {},
            "model_name": classification_record.model_name if classification_record else None,
        } if classification_record else {},
        "period": "Day t+1",
    })

    return {
        "success": True,
        "total_patterns": len(patterns_list),
        "patterns": patterns_list,
        "clustering_summary": clustering_record.summary_clusters if clustering_record else None,
        "last_updated": datetime.now(timezone.utc).isoformat(),
    }

