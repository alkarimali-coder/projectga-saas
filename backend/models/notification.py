from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from core.db import Base
from datetime import datetime

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    message = Column(String)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
