from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.db import get_db
from backend.app.utils.cache import cached
from sqlalchemy import or_, String

router = APIRouter(prefix="/search")

@router.get("/")
@cached(ttl=60)
async def search(q: str = "", db: Session = Depends(get_db)):
    from backend.app.models.service_job import ServiceJob
    if not q.strip():
        return []
    results = db.query(ServiceJob).filter(
        or_(
            ServiceJob.notes.ilike(f"%{q}%"),
            ServiceJob.machine_id.cast(String).ilike(f"%{q}%")
        )
    ).limit(20).all()
    return [job.dict() for job in results]
