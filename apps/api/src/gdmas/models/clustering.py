from datetime import datetime
from typing import Optional, Any, Dict
from sqlalchemy import BigInteger, String, DateTime, ForeignKey, Integer, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from gdmas.db.base import Base


class ClusteringResult(Base):
    __tablename__ = "clustering_results"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    algorithm: Mapped[str] = mapped_column(String(32), nullable=False)
    parameters: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False)
    total_clusters: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    noise_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    summary_clusters: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    calculated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    service_run_id: Mapped[Optional[int]] = mapped_column(BigInteger, ForeignKey("service_runs.id", ondelete="SET NULL"), nullable=True)


class ClusteringEventMapping(Base):
    __tablename__ = "clustering_event_mapping"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    cluster_result_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("clustering_results.id", ondelete="CASCADE"), nullable=False)
    event_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("earthquake_events.id", ondelete="CASCADE"), nullable=False)
    cluster_label: Mapped[int] = mapped_column(Integer, nullable=False)

