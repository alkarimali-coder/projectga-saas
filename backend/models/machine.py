from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from core.db import Base
from datetime import datetime

class Machine(Base):
    __tablename__ = "machines"
    id = Column(Integer, primary_key=True)
    serial_number = Column(String, unique=True)
    location = Column(String)
    status = Column(String, default="active")  # active, down, maintenance
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    installed_at = Column(DateTime, default=datetime.utcnow)
