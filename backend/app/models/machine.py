from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.db import Base

class Machine(Base):
    __tablename__ = "machines"
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(String, index=True, nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id", ondelete="SET NULL"), index=True)
    manufacturer = Column(String, nullable=False)
    model = Column(String, nullable=False)
    game = Column(String)
    version = Column(String)
    coam_id = Column(String, unique=True, index=True, nullable=False)
    qr_tag = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    location = relationship("Location", back_populates="machines")
