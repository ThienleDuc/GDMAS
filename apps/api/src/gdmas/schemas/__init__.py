"""Pydantic Data Schemas Package for GDMAS."""

from gdmas.schemas.earthquake import (
    EarthquakeBase,
    EarthquakeListResponse,
    EarthquakeMetadata,
    EarthquakeResponse,
    EarthquakeStatistics,
    StatisticsResponse,
)

__all__ = [
    "EarthquakeBase",
    "EarthquakeListResponse",
    "EarthquakeMetadata",
    "EarthquakeResponse",
    "EarthquakeStatistics",
    "StatisticsResponse",
]
