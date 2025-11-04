from alembic import op
import sqlalchemy as sa

revision = 'phase_03_rbac_settings_core_audit'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # roles
    op.create_table(
        'roles',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(length=50), nullable=False, unique=True),
        sa.Column('description', sa.String(length=255), nullable=True),
    )

    # user_roles
    op.create_table(
        'user_roles',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE')),
        sa.Column('role_name', sa.String(length=50), sa.ForeignKey('roles.name', ondelete='SET NULL')),
    )

    # system_settings
    op.create_table(
        'system_settings',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('api_version', sa.String(length=10), nullable=False, server_default='v1'),
        sa.Column('rate_limit_login', sa.String(length=30), nullable=False, server_default='5/minute'),
        sa.Column('rate_limit_general', sa.String(length=30), nullable=False, server_default='100/minute'),
        sa.Column('rate_limit_core', sa.String(length=30), nullable=False, server_default='30/minute'),
        sa.Column('enable_rate_limiting', sa.Boolean(), nullable=False, server_default=sa.text('1')),
        sa.Column('redis_url', sa.String(length=255), nullable=True),
        sa.Column('updated_by', sa.String(length=120), nullable=False, server_default='System'),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )

    # core_policy
    op.create_table(
        'core_policy',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('role_name', sa.String(length=50), nullable=False),
        sa.Column('rules_json', sa.Text(), nullable=False),
        sa.Column('updated_by', sa.String(length=120), nullable=False, server_default='System'),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )

    # job_audit
    op.create_table(
        'job_audit',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('actor_email', sa.String(length=120)),
        sa.Column('actor_role', sa.String(length=50)),
        sa.Column('method', sa.String(length=10)),
        sa.Column('path', sa.String(length=255)),
        sa.Column('status_code', sa.Integer()),
        sa.Column('reason', sa.String(length=255)),
        sa.Column('required_roles', sa.String(length=255)),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )

def downgrade():
    op.drop_table('job_audit')
    op.drop_table('core_policy')
    op.drop_table('system_settings')
    op.drop_table('user_roles')
    op.drop_table('roles')
