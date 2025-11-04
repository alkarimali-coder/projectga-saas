from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.db import Base

class WorkOrder(Base):
    __tablename__ = "work_orders"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(String, index=True, nullable=False)
    machine_id = Column(Integer, ForeignKey("machines.id", ondelete="SET NULL"), index=True)
    status = Column(String, index=True, nullable=False)
    assigned_to = Column(String)
    priority = Column(String)
    opened_at = Column(DateTime(timezone=True), server_default=func.now())
    closed_at = Column(DateTime(timezone=True))
    machine = relationship("Machine")
