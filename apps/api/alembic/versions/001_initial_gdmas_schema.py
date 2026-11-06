"""initial_gdmas_schema

Revision ID: 001_initial_gdmas_schema
Revises: 
Create Date: 2026-11-06 23:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial_gdmas_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create service_runs table
    op.create_table(
        'service_runs',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('service_name', sa.String(length=32), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(length=16), server_default='RUNNING', nullable=False),
        sa.Column('records_processed', sa.Integer(), server_default='0', nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # 2. Create earthquake_events table
    op.create_table(
        'earthquake_events',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('source', sa.String(length=32), server_default='USGS', nullable=False),
        sa.Column('source_event_id', sa.String(length=64), nullable=False),
        sa.Column('event_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('source_updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ingested_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('depth_km', sa.Float(), nullable=False),
        sa.Column('magnitude', sa.Float(), nullable=False),
        sa.Column('magnitude_type', sa.String(length=16), nullable=True),
        sa.Column('place', sa.Text(), nullable=True),
        sa.Column('source_url', sa.Text(), nullable=True),
        sa.Column('raw_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('source', 'source_event_id', name='uq_earthquake_source_event')
    )
    op.create_index('idx_earthquake_events_event_time', 'earthquake_events', ['event_time'], unique=False)
    op.create_index('idx_earthquake_events_magnitude', 'earthquake_events', ['magnitude'], unique=False)
    op.create_index('idx_earthquake_events_time_mag', 'earthquake_events', ['event_time', 'magnitude'], unique=False)
    op.create_index('idx_earthquake_events_coordinates', 'earthquake_events', ['latitude', 'longitude'], unique=False)

    # 3. Create analysis_results table
    op.create_table(
        'analysis_results',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('analysis_type', sa.String(length=32), nullable=False),
        sa.Column('time_interval', sa.String(length=16), nullable=False),
        sa.Column('period_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('period_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('metrics_data', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('calculated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('service_run_id', sa.BigInteger(), nullable=True),
        sa.ForeignKeyConstraint(['service_run_id'], ['service_runs.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_analysis_results_type_period', 'analysis_results', ['analysis_type', 'period_end'], unique=False)

    # 4. Create clustering_results table
    op.create_table(
        'clustering_results',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('algorithm', sa.String(length=32), nullable=False),
        sa.Column('parameters', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('total_clusters', sa.Integer(), server_default='0', nullable=False),
        sa.Column('noise_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('summary_clusters', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('calculated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('service_run_id', sa.BigInteger(), nullable=True),
        sa.ForeignKeyConstraint(['service_run_id'], ['service_runs.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    # 5. Create clustering_event_mapping table
    op.create_table(
        'clustering_event_mapping',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('cluster_result_id', sa.BigInteger(), nullable=False),
        sa.Column('event_id', sa.BigInteger(), nullable=False),
        sa.Column('cluster_label', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['cluster_result_id'], ['clustering_results.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['event_id'], ['earthquake_events.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 6. Create prediction_results table
    op.create_table(
        'prediction_results',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('target_date', sa.Date(), nullable=False),
        sa.Column('metric_name', sa.String(length=32), nullable=False),
        sa.Column('predicted_value', sa.Float(), nullable=False),
        sa.Column('lower_bound', sa.Float(), nullable=False),
        sa.Column('upper_bound', sa.Float(), nullable=False),
        sa.Column('actual_value', sa.Float(), nullable=True),
        sa.Column('model_name', sa.String(length=64), nullable=False),
        sa.Column('model_version', sa.String(length=16), server_default='1.0.0', nullable=False),
        sa.Column('evaluation_metrics', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('generated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('service_run_id', sa.BigInteger(), nullable=True),
        sa.ForeignKeyConstraint(['service_run_id'], ['service_runs.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_prediction_results_target_date', 'prediction_results', ['target_date'], unique=False)

    # 7. Create classification_results table
    op.create_table(
        'classification_results',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('target_date', sa.Date(), nullable=False),
        sa.Column('predicted_label', sa.String(length=32), nullable=False),
        sa.Column('probability_scores', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('actual_label', sa.String(length=32), nullable=True),
        sa.Column('model_name', sa.String(length=64), nullable=False),
        sa.Column('model_version', sa.String(length=16), server_default='1.0.0', nullable=False),
        sa.Column('evaluation_metrics', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('generated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('service_run_id', sa.BigInteger(), nullable=True),
        sa.ForeignKeyConstraint(['service_run_id'], ['service_runs.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_classification_results_target_date', 'classification_results', ['target_date'], unique=False)


def downgrade() -> None:
    op.drop_table('classification_results')
    op.drop_table('prediction_results')
    op.drop_table('clustering_event_mapping')
    op.drop_table('clustering_results')
    op.drop_table('analysis_results')
    op.drop_table('earthquake_events')
    op.drop_table('service_runs')

