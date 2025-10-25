from sqlalchemy import Column, Integer, String
from app.core.db import Base

class Tenant(Base):
    __tablename__ = "tenants"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    master_license = Column(String, unique=True, nullable=False)
