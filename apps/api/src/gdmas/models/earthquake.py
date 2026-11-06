from datetime import datetime
from typing import Optional, Any, Dict
from sqlalchemy import BigInteger, String, DateTime, Text, Float, func, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from gdmas.db.base import Base


class EarthquakeEvent(Base):
    __tablename__ = "earthquake_events"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(String(32), nullable=False, default="USGS")
    source_event_id: Mapped[str] = mapped_column(String(64), nullable=False)
    event_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    source_updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ingested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    depth_km: Mapped[float] = mapped_column(Float, nullable=False)
    magnitude: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    magnitude_type: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    place: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    raw_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)

    __table_args__ = (
        UniqueConstraint("source", "source_event_id", name="uq_earthquake_source_event"),
        Index("idx_earthquake_events_time_mag", "event_time", "magnitude"),
        Index("idx_earthquake_events_coordinates", "latitude", "longitude"),
    )

