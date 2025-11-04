from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.core.db import Base

class UserRole(Base):
    __tablename__ = "user_roles"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    role_name = Column(String(50), ForeignKey("roles.name", ondelete="SET NULL"))

    # optional relationships
    # user = relationship("User", back_populates="roles")
