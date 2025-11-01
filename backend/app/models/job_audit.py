from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from backend.app.core.db import Base
from datetime import datetime

class JobAudit(Base):
    __tablename__ = "job_audit"
    
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("service_jobs.id"))
    user_id = Column(Integer)
    action = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)

    def dict(self):
        return {
            "id": self.id,
            "job_id": self.job_id,
            "user_id": self.user_id,
            "action": self.action,
            "timestamp": self.timestamp.isoformat()
        }
