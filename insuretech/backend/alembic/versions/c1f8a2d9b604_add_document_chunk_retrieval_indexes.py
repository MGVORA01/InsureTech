"""Add pgvector, full-text, and metadata indexes for policy retrieval.

Revision ID: c1f8a2d9b604
Revises: d517c4e1a729
"""

from alembic import op


revision = "c1f8a2d9b604"
down_revision = "d517c4e1a729"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_document_chunks_embedding_hnsw "
        "ON document_chunks USING hnsw (embedding vector_cosine_ops)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_document_chunks_text_fts "
        "ON document_chunks USING gin (to_tsvector('english', coalesce(chunk_text, '')))"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_document_chunks_category "
        "ON document_chunks ((document_metadata->>'insurance_category'))"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_document_chunks_section_type "
        "ON document_chunks ((document_metadata->>'section_type'))"
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_document_chunks_policy_id ON document_chunks (policy_id)")


def downgrade() -> None:
    for name in (
        "ix_document_chunks_policy_id",
        "ix_document_chunks_section_type",
        "ix_document_chunks_category",
        "ix_document_chunks_text_fts",
        "ix_document_chunks_embedding_hnsw",
    ):
        op.execute(f"DROP INDEX IF EXISTS {name}")
