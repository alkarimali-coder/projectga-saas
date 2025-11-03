from sqlalchemy import Column, Integer
from app.core.db import Base

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False)
    total_cents = Column(Integer, nullable=False, default=0)

