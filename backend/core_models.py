from sqlalchemy import Column, String, Boolean, DateTime
from core.db import Base
import uuid
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)
    first_name = Column(String)
    last_name = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
