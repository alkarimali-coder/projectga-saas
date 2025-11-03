from sqlalchemy.orm import Session
from database import SessionLocal, Database, Base
from auth_service import auth_service
import uuid
from datetime import datetime
import core_models
from core_models import User

# Clear metadata to ensure fresh registration
Base.metadata.clear()

def init_db_and_create_user():
    import core_models
    db = Database()
    db.create_tables()
    db_session: Session = SessionLocal()
    try:
        existing_user = db_session.query(User).filter(User.email == "admin@coam.com").first()
        if existing_user:
            print("Test user already exists: admin@coam.com")
            return
        hashed_password = auth_service.hash_password("admin123")
        user = User(
            id=str(uuid.uuid4()),
            email="admin@coam.com",
            password_hash=hashed_password,
            role="admin",
            first_name="Admin",
            last_name="User",
            is_active=True,
            created_at=datetime.utcnow(),
            last_login=None
        )
        db_session.add(user)
        db_session.commit()
        print("Test user created: admin@coam.com")
    except Exception as e:
        print(f"Error: {str(e)}")
    finally:
        db_session.close()

if __name__ == "__main__":
    init_db_and_create_user()
