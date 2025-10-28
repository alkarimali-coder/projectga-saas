from sqlalchemy import Column, Integer, ForeignKey, Numeric
from backend.db.base import Base

class VendorPart(Base):
    __tablename__ = "vendor_parts"
    id = Column(Integer, primary_key=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"))
    part_name = Column(String)
    price = Column(Numeric(10, 2))
    stock = Column(Integer, default=0)
