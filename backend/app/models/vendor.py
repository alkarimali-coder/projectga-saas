from sqlalchemy import Column, Integer, String, ForeignKey
from app.core.db import Base

class Vendor(Base):
    __tablename__ = "vendors"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    contact_email = Column(String)
    phone = Column(String)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
