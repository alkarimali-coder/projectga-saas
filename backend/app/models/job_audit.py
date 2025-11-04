from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from app.core.db import Base

class JobAudit(Base):
    __tablename__ = "job_audit"
    id = Column(Integer, primary_key=True)
    actor_email = Column(String(120))
    actor_role = Column(String(50))
    method = Column(String(10))
    path = Column(String(255))
    status_code = Column(Integer)
    reason = Column(String(255))
    required_roles = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
