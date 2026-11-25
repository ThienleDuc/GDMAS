"""add earthquake country and region

Revision ID: 002_add_country_region
Revises: 001_initial_gdmas_schema
Create Date: 2026-11-22 00:00:00.000000

Tách `place` của USGS thành 2 cột quốc gia/khu vực để lọc server-side.
Không sửa migration 001 (I4). Backfill dùng chung helper Python với ingestion
để bảo đảm FE/BE không lệch nhãn.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "002_add_country_region"
down_revision: str | None = "001_initial_gdmas_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

COUNTRY_LENGTH = 128


def upgrade() -> None:
    op.add_column(
        "earthquake_events",
        sa.Column("country", sa.String(length=COUNTRY_LENGTH), nullable=True),
    )
    op.add_column(
        "earthquake_events",
        sa.Column("region", sa.String(length=COUNTRY_LENGTH), nullable=True),
    )
    op.create_index(
        "idx_earthquake_events_country_region",
        "earthquake_events",
        ["country", "region"],
        unique=False,
    )

    # Backfill bằng đúng helper của BE — tránh lệch regex giữa SQL và Python.
    from gdmas.services.ingestion.geo import derive_place_fields

    connection = op.get_bind()
    rows = connection.execute(
        sa.text(
            "SELECT id, place FROM earthquake_events "
            "WHERE country IS NULL OR region IS NULL"
        )
    ).mappings()
    for row in rows:
        country, region = derive_place_fields(row["place"])
        connection.execute(
            sa.text(
                "UPDATE earthquake_events SET country = :country, region = :region "
                "WHERE id = :id"
            ),
            {"country": country, "region": region, "id": row["id"]},
        )


def downgrade() -> None:
    op.drop_index(
        "idx_earthquake_events_country_region", table_name="earthquake_events"
    )
    op.drop_column("earthquake_events", "region")
    op.drop_column("earthquake_events", "country")
