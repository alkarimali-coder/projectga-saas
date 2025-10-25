from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from app.core.db import Base
from datetime import datetime

class RevenueLog(Base):
    __tablename__ = "revenue_logs"
    id = Column(Integer, primary_key=True)
    collection_id = Column(Integer, ForeignKey("collections.id"))
    amount = Column(Float)
    logged_at = Column(DateTime, default=datetime.utcnow)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
