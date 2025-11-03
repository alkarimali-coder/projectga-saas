from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# Detect which database URL we’re using
DB_URL = settings.SQLALCHEMY_DATABASE_URI

# For SQLite only, we need this to avoid "check_same_thread" errors
connect_args = {}
if DB_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# Create engine
engine = create_engine(DB_URL, future=True, echo=False, connect_args=connect_args)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)

# Base class for models
Base = declarative_base()

def get_engine_info():
    if "postgres" in DB_URL:
        return "PostgreSQL (Production)"
    elif "sqlite" in DB_URL:
        return "SQLite (Local Dev)"
    else:
        return "Unknown DB Type"
