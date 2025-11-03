from sqlalchemy import Column, Integer, String
from app.core.db import Base

class Metric(Base):
    __tablename__ = "bi_metrics"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    value = Column(String, nullable=True)

