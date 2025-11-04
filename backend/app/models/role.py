from sqlalchemy import Column, Integer, String, UniqueConstraint
from app.core.db import Base

class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)  # e.g., SuperAdmin, MLAdmin, Dispatch
    description = Column(String(255), nullable=True)

    __table_args__ = (UniqueConstraint('name', name='uq_roles_name'),)
