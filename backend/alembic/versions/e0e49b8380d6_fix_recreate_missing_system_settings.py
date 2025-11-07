"""fix: recreate missing system_settings

Revision ID: e0e49b8380d6
Revises: 3ca49922c2cc
Create Date: 2025-10-29 16:32:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = 'e0e49b8380d6'
down_revision = '3ca49922c2cc'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = inspect(conn)

    # --- core_context (safe create) ---
    if 'core_context' not in inspector.get_table_names():
        op.create_table(
            'core_context',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('tenant_id', sa.String(), nullable=False),
            sa.Column('key', sa.String(), nullable=False),
            sa.Column('value', sa.Text(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP')),
        )

    # --- system_settings (safe create) ---
    if 'system_settings' not in inspector.get_table_names():
        op.create_table(
            'system_settings',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('setting_key', sa.String(), nullable=False, unique=True),
            sa.Column('setting_value', sa.String(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP')),
        )


def downgrade():
    op.drop_table('system_settings')
    op.drop_table('core_context')

