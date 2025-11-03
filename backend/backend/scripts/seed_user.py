from sqlalchemy.orm import Session
from app.core.db import SessionLocal, Base, engine
from app.models.user import User
from app.core.security import get_password_hash

def create_user(email, password, role, tenant_id):
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        if db.query(User).filter(User.email == email).first():
            print(f"{email} already exists.")
            return
        user = User(
            email=email,
            hashed_password=get_password_hash(password),
            role=role,
            tenant_id=tenant_id,
            is_active=True
        )
        db.add(user)
        db.commit()
        print(f"✅ Created {role}: {email} / {password}")
    finally:
        db.close()

if __name__ == "__main__":
    create_user("mladmin@coam.com", "ml123", "MLAdmin", "ML_10001")
    create_user("dispatch@coam.com", "dispatch123", "Dispatch", "ML_10001")
    create_user("tech@coam.com", "tech123", "FieldTech", "ML_10001")
    create_user("warehouse@coam.com", "warehouse123", "Warehouse", "ML_10001")
