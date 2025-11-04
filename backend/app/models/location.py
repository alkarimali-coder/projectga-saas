from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import relationship
from app.core.db import Base

class Location(Base):
    __tablename__ = "locations"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    address = Column(String)
    city = Column(String)
    state = Column(String)
    zip = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    machines = relationship("Machine", back_populates="location", cascade="all, delete-orphan")
