"""Pydantic Data Schemas Package for GDMAS."""
from gdmas.schemas.earthquake import (
    EarthquakeBase,
    EarthquakeResponse,
    EarthquakeMetadata,
    EarthquakeListResponse,
    EarthquakeStatistics,
    StatisticsResponse,
)

__all__ = [
    "EarthquakeBase",
    "EarthquakeResponse",
    "EarthquakeMetadata",
    "EarthquakeListResponse",
    "EarthquakeStatistics",
    "StatisticsResponse",
]
