from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from core.db import Base
from datetime import datetime

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String)
    entity = Column(String)
    entity_id = Column(Integer)
    timestamp = Column(DateTime, default=datetime.utcnow)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
