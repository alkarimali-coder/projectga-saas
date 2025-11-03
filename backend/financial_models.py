from sqlalchemy import Column, Integer, String, Date
from app.core.db import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    amount_cents = Column(Integer, nullable=False, default=0)
    occurred_on = Column(Date, nullable=True)
    note = Column(String, nullable=True)

