from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime
from app.core.db import Base

class CorePolicy(Base):
    __tablename__ = "core_policy"
    id = Column(Integer, primary_key=True)
    role_name = Column(String(50), nullable=False)     # maps to roles.name
    rules_json = Column(Text, nullable=False)          # JSON string
    updated_by = Column(String(120), default="System")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
