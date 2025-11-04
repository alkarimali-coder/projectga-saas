from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.db import SessionLocal
from app.models.core_policy import CorePolicy
from app.services.permissions import require_roles

router = APIRouter(prefix="/api/v1/core-policy", tags=["core-policy"])

class PolicyUpsert(BaseModel):
    role_name: str
    rules_json: str  # JSON string

@router.get("/")
@require_roles("SuperAdmin", "MLAdmin")
async def all_policies():
    db: Session = SessionLocal()
    try:
        return db.query(CorePolicy).all()
    finally:
        db.close()

@router.put("/")
@require_roles("SuperAdmin")
async def upsert_policy(body: PolicyUpsert):
    db: Session = SessionLocal()
    try:
        row = db.query(CorePolicy).filter(CorePolicy.role_name == body.role_name).first()
        if not row:
            row = CorePolicy(role_name=body.role_name, rules_json=body.rules_json)
            db.add(row)
        else:
            row.rules_json = body.rules_json
        db.commit()
        return {"ok": True}
    finally:
        db.close()
