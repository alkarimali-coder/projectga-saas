from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# Database URL from .env
DATABASE_URL = getattr(settings, "DATABASE_URL", None)
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in environment variables")

# Connection pooling (Phase 4 settings)
engine = create_engine(
    DATABASE_URL,
    pool_size=int(getattr(settings, "POOL_SIZE", 10)),
    max_overflow=int(getattr(settings, "POOL_OVERFLOW", 20)),
    pool_timeout=int(getattr(settings, "POOL_TIMEOUT", 30)),
    pool_recycle=int(getattr(settings, "POOL_RECYCLE", 1800)),
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ✅ Dependency for FastAPI routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Optional utility for graceful shutdown
def dispose_engine():
    engine.dispose()
