"""Kiểm pipeline HTTP → parser → upsert thật; chỉ giả lập HTTP và biên session/DB."""

from types import SimpleNamespace

import httpx
from sqlalchemy.dialects import postgresql

from gdmas.models.service_run import ServiceRun
from gdmas.services.ingestion.service import IngestionService

PRIMARY_URL = "https://offline.example/usgs.geojson"


def feature(event_id, *, mag=3.0, updated=1794358800000, coordinates=None):
    return {
        "id": event_id,
        "properties": {"mag": mag, "time": 1794355200000, "updated": updated},
        "geometry": {
            "type": "Point",
            "coordinates": coordinates or [142.0, 38.0, 20.0],
        },
    }


class RecordingSession:
    def __init__(self, execute_error=None):
        self.run = None
        self.statements = []
        self.closed = False
        self.rollbacks = 0
        self.execute_error = execute_error

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.closed = True

    def add(self, record):
        assert isinstance(record, ServiceRun)
        self.run = record

    def refresh(self, record):
        record.id = 1

    def commit(self):
        pass

    def rollback(self):
        self.rollbacks += 1

    def query(self, *args):
        return SimpleNamespace(count=lambda: 10)

    def execute(self, statement):
        self.statements.append(statement.compile(dialect=postgresql.dialect()))
        if self.execute_error is not None:
            raise self.execute_error
        return [SimpleNamespace(inserted=True), SimpleNamespace(inserted=False)]


# TC-19
def test_http_parser_upsert_pipeline_keeps_latest_revision_and_counts():
    payload = {
        "features": [
            feature("new", mag=2.0),
            feature("new", mag=4.0, updated=1794358800001),
            feature("existing", mag=5.0),
            feature("invalid", coordinates=[999, 0, 20]),
        ]
    }
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json=payload))
    session = RecordingSession()

    result = IngestionService(
        PRIMARY_URL, session_factory=lambda: session, http_transport=transport
    ).execute_cycle()

    assert result["success"] is True
    assert result["inserted"] == 1 and result["updated"] == 1
    assert result["unchanged"] == 0 and result["skipped_invalid"] == 1
    assert session.run.status == "SUCCESS" and session.run.records_processed == 2
    assert len(session.statements) == 1
    statement = session.statements[0]
    assert statement.params["source_event_id_m0"] == "new"
    assert statement.params["magnitude_m0"] == 4.0
    assert statement.params["source_event_id_m1"] == "existing"
    assert "source_event_id_m2" not in statement.params
    assert "ON CONFLICT ON CONSTRAINT uq_earthquake_source_event DO UPDATE" in str(
        statement
    )
    assert "excluded.source_updated_at > earthquake_events.source_updated_at" in str(
        statement
    )
    assert session.closed and session.rollbacks == 0


def test_upsert_database_failure_marks_pipeline_failed_and_closes_session():
    payload = {"features": [feature("a")]}
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json=payload))
    session = RecordingSession(execute_error=RuntimeError("offline database failure"))

    result = IngestionService(
        PRIMARY_URL, session_factory=lambda: session, http_transport=transport
    ).execute_cycle()

    assert result["success"] is False
    assert len(session.statements) == 1
    assert session.run.status == "FAILED"
    assert session.run.error_message == "RuntimeError: offline database failure"
    assert session.rollbacks == 1 and session.closed
