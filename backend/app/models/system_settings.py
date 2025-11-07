from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.core.db import Base  # <-- this must exist

class SystemSettings(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    api_version = Column(String, default="v1")
    rate_limit_login = Column(Integer, default=10)
    rate_limit_general = Column(Integer, default=100)
    rate_limit_core = Column(Integer, default=1000)
    enable_rate_limiting = Column(Boolean, default=False)
    redis_url = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

