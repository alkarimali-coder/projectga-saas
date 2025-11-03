from sqlalchemy.orm import Session
from app.core.db import SessionLocal

def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
