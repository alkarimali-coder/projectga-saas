from pydantic import BaseModel
from typing import Optional
from backend.app.core.db import Base
from sqlalchemy import Column, Integer, String, Boolean

class ServiceJobCreate(BaseModel):
    machine_id: int
    tenant_id: int
    status: str
    notes: Optional[str] = None
    photos: Optional[list] = None
    needs_followup: Optional[bool] = False

class ServiceJob(Base):
    def dict(self):
        return {
            "id": self.id,
            "machine_id": self.machine_id,
            "status": self.status,
            "notes": self.notes,
            "tenant_id": self.tenant_id,
            "needs_followup": self.needs_followup
        }
    __tablename__ = "service_jobs"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer)
    tenant_id = Column(Integer)
    status = Column(String)
    notes = Column(String)
    photos = Column(String)
    needs_followup = Column(Boolean, default=False)
