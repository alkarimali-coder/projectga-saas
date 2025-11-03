from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from app.core.db import Base

# Roles could be: SuperAdmin, MLAdmin, LLAdmin, Dispatch, Warehouse, FieldTech, Viewer
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)

    role = Column(String(50), nullable=False, default="Viewer")
    tenant_id = Column(String(64), index=True, nullable=True)  # e.g., ML_10001

    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
