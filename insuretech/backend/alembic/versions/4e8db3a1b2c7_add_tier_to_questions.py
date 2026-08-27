"""add tier column to questions table

Revision ID: 4e8db3a1b2c7
Revises: a46f0d47e055
Create Date: 2026-06-28 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '4e8db3a1b2c7'
down_revision: Union[str, Sequence[str], None] = 'a46f0d47e055'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'questions',
        sa.Column('tier', sa.Integer(), nullable=False, server_default=sa.text('1')),
    )


def downgrade() -> None:
    op.drop_column('questions', 'tier')
