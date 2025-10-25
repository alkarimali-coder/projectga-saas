from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from app.core.db import Base
from datetime import datetime

class ServiceJob(Base):
    __tablename__ = "service_jobs"
    id = Column(Integer, primary_key=True)
    machine_id = Column(Integer, ForeignKey("machines.id"))
    tech_id = Column(Integer, ForeignKey("users.id"))
    issue = Column(String)
    status = Column(String, default="pending")
    scheduled_at = Column(DateTime)
    completed_at = Column(DateTime)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
