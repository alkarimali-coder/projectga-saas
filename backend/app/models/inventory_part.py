from sqlalchemy import Column, Integer, String, Float, ForeignKey
from app.core.db import Base

class InventoryPart(Base):
    __tablename__ = "inventory_parts"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    part_number = Column(String, unique=True)
    quantity = Column(Integer, default=0)
    min_stock = Column(Integer, default=5)
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
