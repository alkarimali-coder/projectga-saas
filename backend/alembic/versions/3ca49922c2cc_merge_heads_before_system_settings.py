"""merge heads before system_settings

Revision ID: 3ca49922c2cc
Revises: phase_03_rbac_settings_core_audit, e34c3a1ac739
Create Date: 2025-11-04 12:46:18.106863

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3ca49922c2cc'
down_revision: Union[str, None] = ('phase_03_rbac_settings_core_audit', 'e34c3a1ac739')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
