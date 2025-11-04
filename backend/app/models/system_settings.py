from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime
from app.core.db import Base

class SystemSettings(Base):
    __tablename__ = "system_settings"
    id = Column(Integer, primary_key=True)
    api_version = Column(String(10), default="v1")
    rate_limit_login = Column(String(30), default="5/minute")
    rate_limit_general = Column(String(30), default="100/minute")
    rate_limit_core = Column(String(30), default="30/minute")
    enable_rate_limiting = Column(Boolean, default=True)
    redis_url = Column(String(255), nullable=True)

    updated_by = Column(String(120), default="System")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
