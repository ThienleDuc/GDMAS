from datetime import datetime
from typing import Optional
from sqlalchemy import BigInteger, String, DateTime, Text, Integer, func
from sqlalchemy.orm import Mapped, mapped_column

from gdmas.db.base import Base


class ServiceRun(Base):
    __tablename__ = "service_runs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    service_name: Mapped[str] = mapped_column(String(32), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="RUNNING")
    records_processed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

