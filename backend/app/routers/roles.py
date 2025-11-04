from fastapi import APIRouter
from sqlalchemy.orm import Session
from app.core.db import SessionLocal
from app.models.role import Role
from app.services.permissions import require_roles

router = APIRouter(prefix="/api/v1/roles", tags=["roles"])

@router.get("/")
@require_roles("SuperAdmin", "MLAdmin")
async def list_roles():
    db: Session = SessionLocal()
    try:
        return db.query(Role).all()
    finally:
        db.close()
