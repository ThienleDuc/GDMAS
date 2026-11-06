from datetime import datetime
from typing import Optional, Any, Dict
from sqlalchemy import BigInteger, String, DateTime, ForeignKey, func, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from gdmas.db.base import Base


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    analysis_type: Mapped[str] = mapped_column(String(32), nullable=False)
    time_interval: Mapped[str] = mapped_column(String(16), nullable=False)
    period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    metrics_data: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False)
    calculated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    service_run_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("service_runs.id", ondelete="SET NULL"), nullable=True)

    __table_args__ = (
        Index("idx_analysis_results_type_period", "analysis_type", "period_end"),
    )

