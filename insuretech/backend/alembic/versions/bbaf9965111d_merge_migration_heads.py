"""Merge migration heads

Revision ID: bbaf9965111d
Revises: 04b5d14bf50b, 9d6c13af057f
Create Date: 2026-07-01 23:48:01.709705

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bbaf9965111d'
down_revision: Union[str, Sequence[str], None] = ('04b5d14bf50b', '9d6c13af057f')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
