from sqlalchemy import Column, Integer, String, DateTime, Text, func, Index
from app.core.db import Base

class CoreContext(Base):
    __tablename__ = "core_context"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(String, index=True, nullable=False)
    key = Column(String, nullable=False)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

Index("ix_core_context_tenant_key", CoreContext.tenant_id, CoreContext.key, unique=True)
