from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from core.db import Base
from datetime import datetime

class Collection(Base):
    __tablename__ = "collections"
    id = Column(Integer, primary_key=True)
    machine_id = Column(Integer, ForeignKey("machines.id"))
    amount = Column(Float)
    collected_at = Column(DateTime, default=datetime.utcnow)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
