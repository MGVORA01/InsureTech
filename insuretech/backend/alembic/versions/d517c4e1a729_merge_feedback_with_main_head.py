"""Merge feedback head into main branch

Revision ID: d517c4e1a729
Revises: bbaf9965111d, 10e7d3c82a5a
Create Date: 2026-07-25 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op


revision: str = "d517c4e1a729"
down_revision: Union[str, Sequence[str], None] = ("bbaf9965111d", "10e7d3c82a5a")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
