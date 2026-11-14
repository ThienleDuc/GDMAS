"""Fixture dùng chung cho test REST/SSE offline (không cần PostgreSQL).

CSDL giả là SQLite trong bộ nhớ dùng đúng các model ORM thật, nên các truy vấn
lọc, đếm, phân trang chạy thật. Hai kiểu riêng của PostgreSQL được ánh xạ sang
kiểu tương đương của SQLite chỉ trong phạm vi test.
"""

import math
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import BigInteger, create_engine, event
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from gdmas.db.base import Base
from gdmas.db.connection import get_db
from gdmas.main import app
from gdmas.models.earthquake import EarthquakeEvent


@compiles(JSONB, "sqlite")
def _jsonb_as_json(_type, _compiler, **_kw):
    return "JSON"


@compiles(BigInteger, "sqlite")
def _bigint_as_integer(_type, _compiler, **_kw):
    return "INTEGER"


class BrokenSession:
    """Session mô phỏng PostgreSQL mất kết nối: mọi thao tác đều ném OperationalError."""

    def __getattr__(self, _name):
        raise OperationalError("SELECT 1", {}, Exception("connection refused"))

    # Session thật không ném lỗi khi rollback/close lúc chưa có kết nối
    def rollback(self):
        return None

    def close(self):
        return None


@pytest.fixture
def session_factory():
    engine = create_engine(
        "sqlite://",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(engine, "connect")
    def _register_floor(dbapi_conn, _record):
        dbapi_conn.create_function("floor", 1, math.floor)

    Base.metadata.create_all(engine)
    yield sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    engine.dispose()


@pytest.fixture
def db(session_factory):
    session = session_factory()
    yield session
    session.close()


@pytest.fixture
def client(session_factory):
    def _override():
        session = session_factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = _override
    yield TestClient(app, raise_server_exceptions=False)
    app.dependency_overrides.clear()


@pytest.fixture
def broken_client():
    app.dependency_overrides[get_db] = lambda: BrokenSession()
    yield TestClient(app, raise_server_exceptions=False)
    app.dependency_overrides.clear()


def add_event(db, n: int = 1, **overrides) -> EarthquakeEvent:
    """Thêm một sự kiện địa chấn mẫu. Mặc định: M4.0 cách đây 1 giờ."""
    data = {
        "source": "USGS",
        "source_event_id": f"ev{n:04d}",
        "event_time": datetime.now(UTC) - timedelta(hours=1),
        "latitude": 10.0,
        "longitude": 100.0,
        "depth_km": 10.0,
        "magnitude": 4.0,
        "magnitude_type": "mb",
        "place": f"Place {n}",
        "source_url": f"https://example.org/{n}",
    }
    data.update(overrides)
    event_row = EarthquakeEvent(**data)
    db.add(event_row)
    db.commit()
    return event_row
