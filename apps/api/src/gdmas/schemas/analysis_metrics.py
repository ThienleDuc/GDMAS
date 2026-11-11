"""Versioned metrics written by T3 and passed through the existing patterns API."""

import json
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class MetricsModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class Metadata(MetricsModel):
    schema_version: Literal["1.0"] = "1.0"
    computed_at: datetime
    period_start: datetime
    period_end: datetime
    input_events: int
    valid_events: int
    excluded_values: dict[str, int]
    data_quality: Literal["OK", "INSUFFICIENT_DATA", "EMPTY"]
    reason: str | None = None


class LinePoint(MetricsModel):
    date: str
    event_count: int
    avg_magnitude: float | None
    max_magnitude: float | None
    avg_depth: float | None
    energy_joules: float | None
    partial: bool


class ScatterPoint(MetricsModel):
    id: int
    timestamp: str
    magnitude: float
    depth_km: float | None


class TemporalInterval(MetricsModel):
    line_chart: list[LinePoint]


class TemporalMetrics(MetricsModel):
    metadata: Metadata
    interval: Literal["day"] = "day"
    by_interval: dict[str, TemporalInterval]
    line_chart: list[LinePoint]
    scatter_plot: list[ScatterPoint]
    histogram: dict[str, int]
    total_events: int
    data_points: int
    avg_magnitude: float | None
    max_magnitude: float | None
    min_magnitude: float | None
    avg_depth: float | None
    time_distribution: list[dict[str, str | int]]


class TrendPoint(MetricsModel):
    period: str
    actual_value: float | None
    trend_value: float | None
    partial: bool


class TrendSeries(MetricsModel):
    series: list[TrendPoint]
    slope: float | None
    trend_direction: Literal["increasing", "decreasing", "stable", "insufficient_data"]
    slope_unit: str
    moving_average_window: int
    slope_tolerance: float


class TrendMetrics(MetricsModel):
    metadata: Metadata
    by_interval: dict[str, dict[str, TrendSeries]]
    series: list[TrendPoint]
    trend_line: list[TrendPoint]
    slope: float | None
    trend_direction: str
    direction: str
    resampling: str
    metric: str


class SeasonalPoint(MetricsModel):
    cycle_index: int
    period_label: str
    seasonal_factor: float


class SeasonalSeries(MetricsModel):
    data_quality: Literal["OK", "INSUFFICIENT_DATA"]
    reason: str | None
    period: int
    complete_buckets: int
    seasonal_line: list[SeasonalPoint]
    timestamps: list[str]
    observed: list[float]
    trend: list[float | None]
    seasonal: list[float | None]
    residual: list[float | None]
    seasonality_strength: float | None = Field(ge=0, le=1)
    residual_variance: float | None


class SeasonalityMetrics(MetricsModel):
    metadata: Metadata
    by_interval: dict[str, SeasonalSeries]
    seasonal_line: list[SeasonalPoint]
    seasonal_components: list[SeasonalPoint]
    seasonality_strength: float | None = Field(ge=0, le=1)
    periodicity: str
    peak_season: str | None


class CorrelationMetrics(MetricsModel):
    metadata: Metadata
    variables: list[str]
    units: dict[str, str]
    matrix: list[list[float | None]]
    sample_counts: list[list[int]]
    method: Literal["pearson"]
    observation_unit: Literal["event"]
    weighting_note: str
    corr_mag_depth: float | None
    correlation_strength: str

    @model_validator(mode="after")
    def validate_dimensions(self) -> "CorrelationMetrics":
        size = len(self.variables)
        for matrix in (self.matrix, self.sample_counts):
            if len(matrix) != size or any(len(row) != size for row in matrix):
                raise ValueError("Correlation matrices must match the variables")
        for row in self.matrix:
            if any(value is not None and not -1 <= value <= 1 for value in row):
                raise ValueError("Pearson coefficients must be in [-1, 1]")
        return self


class AnalysisPatterns(MetricsModel):
    time_series: TemporalMetrics
    trend: TrendMetrics
    seasonality: SeasonalityMetrics
    correlation: CorrelationMetrics

    def json_metrics(self) -> dict:
        """Reject nonstandard JSON numbers before a transaction replaces snapshots."""
        payload = self.model_dump(mode="json")
        json.dumps(payload, allow_nan=False)
        return payload
