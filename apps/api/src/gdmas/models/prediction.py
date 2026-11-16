from datetime import date, datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from gdmas.db.base import Base


class PredictionResult(Base):
    __tablename__ = "prediction_results"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    target_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    metric_name: Mapped[str] = mapped_column(String(32), nullable=False)
    predicted_value: Mapped[float] = mapped_column(Float, nullable=False)
    lower_bound: Mapped[float] = mapped_column(Float, nullable=False)
    upper_bound: Mapped[float] = mapped_column(Float, nullable=False)
    actual_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    model_name: Mapped[str] = mapped_column(String(64), nullable=False)
    model_version: Mapped[str] = mapped_column(
        String(16), nullable=False, default="1.0.0"
    )
    evaluation_metrics: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB, nullable=True
    )
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    service_run_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("service_runs.id", ondelete="SET NULL"), nullable=True
    )

    __table_args__ = (Index("idx_prediction_results_target_date", "target_date"),)


class ClassificationResult(Base):
    __tablename__ = "classification_results"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    target_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    predicted_label: Mapped[str] = mapped_column(String(32), nullable=False)
    probability_scores: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB, nullable=True
    )
    actual_label: Mapped[str | None] = mapped_column(String(32), nullable=True)
    model_name: Mapped[str] = mapped_column(String(64), nullable=False)
    model_version: Mapped[str] = mapped_column(
        String(16), nullable=False, default="1.0.0"
    )
    evaluation_metrics: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB, nullable=True
    )
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    service_run_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("service_runs.id", ondelete="SET NULL"), nullable=True
    )

    __table_args__ = (Index("idx_classification_results_target_date", "target_date"),)
