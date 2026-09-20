"""Store source-derived policy names for auditable PDF ingestion.

Revision ID: d2e9f3a7b401
Revises: c1f8a2d9b604
"""

from alembic import op
import sqlalchemy as sa


revision = "d2e9f3a7b401"
down_revision = "c1f8a2d9b604"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("policy_documents", sa.Column("policy_name", sa.String(length=255), nullable=True))
    op.add_column("policy_documents", sa.Column("source_pdf_name", sa.String(length=255), nullable=True))
    # Existing documents retain the filename as their reliable source fallback.
    op.execute("UPDATE policy_documents SET source_pdf_name = file_name WHERE source_pdf_name IS NULL")


def downgrade() -> None:
    op.drop_column("policy_documents", "source_pdf_name")
    op.drop_column("policy_documents", "policy_name")
