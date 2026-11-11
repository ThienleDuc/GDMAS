"""Opt-in 1.1 alias contract; the original 1.0 models remain unchanged."""

from datetime import date, timedelta
from typing import Literal

from pydantic import Field, model_validator

from gdmas.schemas.analysis_metrics import (
    AnalysisPatterns,
    Metadata,
    SeasonalityMetrics,
    SeasonalPoint,
    TrendMetrics,
    TrendPoint,
)


class AliasMetadata(Metadata):
    schema_version: Literal["1.1"] = "1.1"


class LegacyTrendPoint(TrendPoint):
    start: date
    end: date
    event_count: int = Field(strict=True, ge=0)
    avg_magnitude: float | None
    trend_slope: float | None

    @model_validator(mode="after")
    def validate_bucket(self) -> "LegacyTrendPoint":
        if (
            self.start.isoformat() != self.period
            or self.start.weekday() != 0
            or self.end - self.start != timedelta(days=7)
            or self.actual_value != self.event_count
        ):
            raise ValueError("Legacy trend fields must describe the same UTC week")
        return self


class LegacySeasonalPoint(SeasonalPoint):
    cycle_index: int = Field(strict=True, ge=1, le=12)
    cycle: str
    typical_events: int = Field(strict=True, ge=0)

    @model_validator(mode="after")
    def validate_cycle(self) -> "LegacySeasonalPoint":
        if self.cycle != f"Tháng {self.cycle_index}":
            raise ValueError("Legacy cycle must identify the same calendar month")
        return self


class AliasTrendMetrics(TrendMetrics):
    metadata: AliasMetadata
    trend_line: list[LegacyTrendPoint]


class AliasSeasonalityMetrics(SeasonalityMetrics):
    metadata: AliasMetadata
    seasonal_components: list[LegacySeasonalPoint]


class AliasAnalysisPatterns(AnalysisPatterns):
    trend: AliasTrendMetrics
    seasonality: AliasSeasonalityMetrics
