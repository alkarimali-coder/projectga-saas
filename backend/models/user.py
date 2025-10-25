from sqlalchemy import Column, Integer, String, DateTime
from core.db import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String)
    master_license = Column(String)
    last_login = Column(DateTime, default=datetime.utcnow)
