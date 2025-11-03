from sqlalchemy import Column, Integer, String
from app.core.db import Base  # Make sure all models share this Base

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    address = Column(String, nullable=True)

