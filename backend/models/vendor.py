from sqlalchemy import Column, Integer, String
from backend.db.base import Base

class Vendor(Base):
    __tablename__ = "vendors"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    contact = Column(String)
    email = Column(String)
