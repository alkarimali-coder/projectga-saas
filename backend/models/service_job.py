from sqlalchemy import Column, Integer, String, Text
from backend.db.base import Base

class ServiceJob(Base):
    __tablename__ = "service_jobs"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(String)  # Now string
    tenant_id = Column(Integer, nullable=True)
    status = Column(String, default="pending")
    notes = Column(Text)
