"""merge question tier and customer support chunks

Revision ID: 9d6c13af057f
Revises: 4e8db3a1b2c7, e7b67edb1b0a
Create Date: 2026-06-30 17:22:13.886499

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9d6c13af057f'
down_revision: Union[str, Sequence[str], None] = ('4e8db3a1b2c7', 'e7b67edb1b0a')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
