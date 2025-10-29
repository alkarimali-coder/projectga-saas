from sqlalchemy import Column, Integer, String, DateTime, func
from backend.db.base import Base

class JobAudit(Base):
    __tablename__ = "job_audit"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer)
    old_status = Column(String)
    new_status = Column(String)
    user_id = Column(Integer)
    timestamp = Column(DateTime, default=func.now())
