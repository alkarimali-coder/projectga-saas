from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import relationship
from app.core.db import Base

class Vendor(Base):
    __tablename__ = "vendors"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False, index=True)
    address = Column(String)
    contact_info = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    parts = relationship("Part", back_populates="vendor", cascade="all, delete-orphan")
