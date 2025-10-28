from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from backend.db.base import Base

class ServiceJob(Base):
    __tablename__ = "service_jobs"
    id = Column(Integer, primary_key=True)
    machine_id = Column(Integer, ForeignKey("machines.id"))
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    status = Column(String, default="pending")  # pending, assigned, in_progress, completed
    notes = Column(String)
