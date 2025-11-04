from sqlalchemy import Column, Integer, String, DateTime, Numeric, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.db import Base

class Part(Base):
    __tablename__ = "parts"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(String, index=True, nullable=False)
    sku = Column(String, index=True, nullable=False)
    description = Column(String, nullable=False)
    vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="SET NULL"), index=True)
    quantity = Column(Integer, default=0)
    cost = Column(Numeric(10, 2), default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    vendor = relationship("Vendor", back_populates="parts")
