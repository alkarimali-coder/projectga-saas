from sqlalchemy import Column, Integer, String, Text
from backend.db.base import Base

class ServiceJob(Base):
    __tablename__ = "service_jobs"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(String)
    tenant_id = Column(Integer, nullable=True)
    status = Column(String, default="open")
    notes = Column(Text)
    photos = Column(Text, nullable=True)  # JSON string
    needs_followup = Column(String, nullable=True)  # e.g. "yes - new coin mech"
