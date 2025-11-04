# app/core/seed_system_settings.py
from datetime import datetime, timezone
from app.core.db import SessionLocal
from app.models.system_settings import SystemSettings

def seed_system_settings():
    db = SessionLocal()
    try:
        # Check if any settings already exist
        existing = db.query(SystemSettings).first()
        if existing:
            print("✅ System settings already exist — skipping seed.")
            return

        defaults = SystemSettings(
            api_version="v1.0",
            enable_rate_limiting=True,
            rate_limit_login=5,
            rate_limit_general=100,
            rate_limit_core=500,
            redis_url=None,
            updated_by="System",
            updated_at=datetime.now(timezone.utc),
        )
        db.add(defaults)
        db.commit()
        print("🌱 Seeded initial system settings successfully!")
    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding system settings: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_system_settings()
