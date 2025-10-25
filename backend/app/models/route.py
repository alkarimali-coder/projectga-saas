from sqlalchemy import Column, Integer, String, ForeignKey
from app.core.db import Base

class Route(Base):
    __tablename__ = "routes"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
