# backend/alembic/env.py
import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# ---------------------------------------------------------------------------
# Make sure Alembic can import "app" no matter where it's launched from
# ---------------------------------------------------------------------------
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

# ---------------------------------------------------------------------------
# Import application metadata
# ---------------------------------------------------------------------------
from app.core.db import Base
from app.models import (
    location,
    machine,
    vendor,
    part,
    work_order,
    core_context,
)
# ---------------------------------------------------------------------------

# Alembic Config object, provides access to the .ini file values
config = context.config

# Interpret the config file for Python logging
fileConfig(config.config_file_name)

# Metadata from our SQLAlchemy models
target_metadata = Base.metadata


def run_migrations_offline():
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    if not url:
        # fallback for environment variable if .ini not populated
        url = os.getenv("DATABASE_URL", "sqlite:///app.db")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """Run migrations in 'online' mode."""
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

