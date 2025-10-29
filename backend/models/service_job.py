from sqlalchemy import Column, Integer, String, Text
from backend.db.base import Base

class ServiceJob(Base):
    __tablename__ = "service_jobs"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer)
    tenant_id = Column(Integer, nullable=True)  # Optional
    status = Column(String, default="pending")
    notes = Column(Text)
