import os
import sys
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

# Import Base
from core.db import Base

# Import ALL models (REGISTER TABLES)
from models.user import User
from models.tenant import Tenant
from models.machine import Machine
from models.route import Route
from models.collection import Collection
from models.inventory_part import InventoryPart
from models.vendor import Vendor
from models.service_job import ServiceJob
from models.revenue_log import RevenueLog
from models.audit_log import AuditLog
from models.notification import Notification

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
