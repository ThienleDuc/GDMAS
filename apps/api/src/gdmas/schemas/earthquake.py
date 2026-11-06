from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, ConfigDict, Field


class EarthquakeBase(BaseModel):
    source: str = "USGS"
    source_event_id: str
    event_time: datetime
    latitude: float
    longitude: float
    depth_km: float
    magnitude: float
    magnitude_type: Optional[str] = None
    place: Optional[str] = None
    source_url: Optional[str] = None


class EarthquakeResponse(EarthquakeBase):
    id: int
    ingested_at: Optional[datetime] = None
    raw_data: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)


class EarthquakeMetadata(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int
    last_updated: Optional[datetime] = None


class EarthquakeListResponse(BaseModel):
    success: bool = True
    data: List[EarthquakeResponse]
    metadata: EarthquakeMetadata


class HourlyTimeSeriesPoint(BaseModel):
    time: str
    count: int
    avg_mag: float


class EarthquakeStatistics(BaseModel):
    total_events: int
    strong_events_count: int  # M >= 5.0
    moderate_events_count: int  # 4.0 <= M < 5.0
    minor_events_count: int = 0  # M < 4.0
    recent_24h_count: int
    avg_magnitude: float
    max_magnitude: float
    latest_event_time: Optional[datetime] = None
    time_series_preview: Optional[List[HourlyTimeSeriesPoint]] = None


class StatisticsResponse(BaseModel):
    success: bool = True
    data: EarthquakeStatistics


class SyncResponse(BaseModel):
    success: bool = True
    message: str
    synced_count: int
    source: str = "USGS"
    timestamp: datetime
