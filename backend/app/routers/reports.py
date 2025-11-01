from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.db import get_db
from backend.app.utils.cache import cached
from sqlalchemy import func

router = APIRouter(prefix="/reports")

@router.get("/")
@cached(ttl=30)
async def get_reports(db: Session = Depends(get_db)):
    from backend.app.models.service_job import ServiceJob
    stats = db.query(
        ServiceJob.status,
        func.count(ServiceJob.id).label("count")
    ).group_by(ServiceJob.status).all()
    return {"by_status": [{"status": s, "count": c} for s, c in stats]}
