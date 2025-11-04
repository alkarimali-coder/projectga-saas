import json
import os
from sqlalchemy.orm import Session
from app.core.db import SessionLocal
from app.models.role import Role
from app.models.system_settings import SystemSettings
from app.models.core_policy import CorePolicy

def seed_roles(db: Session, path: str):
    with open(path, "r") as f:
        data = json.load(f)
    for r in data.get("roles", []):
        if not db.query(Role).filter_by(name=r["name"]).first():
            db.add(Role(name=r["name"], description=r.get("description")))
    db.commit()

def seed_system_settings(db: Session):
    if not db.query(SystemSettings).first():
        db.add(SystemSettings())
        db.commit()

def seed_core_policy(db: Session, path: str):
    with open(path, "r") as f:
        data = json.load(f)
    for role_name, rules in data.items():
        rules_json = json.dumps(rules)
        row = db.query(CorePolicy).filter_by(role_name=role_name).first()
        if not row:
            db.add(CorePolicy(role_name=role_name, rules_json=rules_json))
        else:
            row.rules_json = rules_json
    db.commit()

def main():
    db = SessionLocal()
    try:
        base = os.path.join(os.path.dirname(__file__), "..", "seed_data")
        seed_roles(db, os.path.join(base, "default_role_matrix.json"))
        seed_system_settings(db)
        seed_core_policy(db, os.path.join(base, "core_policy.json"))
        print("Seeding complete.")
    finally:
        db.close()

if __name__ == "__main__":
    main()
