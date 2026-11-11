"""Opt-in aliases inside the original pipeline transaction and advisory lock."""

from collections.abc import Callable
from datetime import datetime

from sqlalchemy.orm import Session

from gdmas.services.analysis.legacy_aliases import add_legacy_aliases
from gdmas.services.analysis.pipeline import AnalysisPipeline
from gdmas.services.analysis.repository import AnalysisRepository


class AliasCompatibleRepository(AnalysisRepository):
    @staticmethod
    def replace_snapshot(
        session: Session, metrics: dict, *, start: datetime, end: datetime, run_id: int
    ) -> None:
        # All conversion/validation must finish before the superclass deletes rows.
        compatible = add_legacy_aliases(metrics) if metrics else {}
        AnalysisRepository.replace_snapshot(
            session, compatible, start=start, end=end, run_id=run_id
        )


class AliasCompatiblePipeline(AnalysisPipeline):
    def __init__(
        self,
        session_factory: Callable[[], Session] | None = None,
        *,
        lookback_days: int | None = None,
    ):
        super().__init__(session_factory, lookback_days=lookback_days)
        self.repository = AliasCompatibleRepository(self.repository.session_factory)
