"""create customer_support_chunks table

Revision ID: e7b67edb1b0a
Revises: a46f0d47e055
Create Date: 2026-06-29 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from pgvector.sqlalchemy import VECTOR

revision: str = 'e7b67edb1b0a'
down_revision: Union[str, Sequence[str], None] = 'a46f0d47e055'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('customer_support_chunks',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('policy_id', sa.UUID(), nullable=False),
        sa.Column('document_id', sa.UUID(), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=False),
        sa.Column('chunk_text', sa.Text(), nullable=False),
        sa.Column('embedding', VECTOR(dim=768), nullable=True),
        sa.Column('page_number', sa.Integer(), nullable=True),
        sa.Column('document_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['policy_id'], ['policies.id'], name=op.f('fk_customer_support_chunks_policy_id_policies')),
        sa.ForeignKeyConstraint(['document_id'], ['policy_documents.id'], name=op.f('fk_customer_support_chunks_document_id_policy_documents')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_customer_support_chunks'))
    )


def downgrade() -> None:
    op.drop_table('customer_support_chunks')
