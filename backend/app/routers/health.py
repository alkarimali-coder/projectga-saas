from fastapi import APIRouter
from sqlalchemy import text
from app.core.db import engine

router = APIRouter(prefix="/api/v1", tags=["Health"])

@router.get("/db-health")
def db_health():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

