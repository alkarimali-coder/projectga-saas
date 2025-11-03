from sqlalchemy.orm import Session
from app.core.db import SessionLocal, Base, engine
from app.models.user import User
from app.core.security import get_password_hash

def main():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        email = "admin@example.com"
        admin = db.query(User).filter(User.email == email).first()
        if admin:
            print("Admin user already exists.")
            return
        u = User(
            email=email,
            hashed_password=get_password_hash("Admin123!"),
            role="SuperAdmin",
            tenant_id="ML_00000",
            is_active=True
        )
        db.add(u)
        db.commit()
        print("Admin created:", email, "password=Admin123!")
    finally:
        db.close()

if __name__ == "__main__":
    main()
