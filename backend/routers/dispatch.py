from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.db.session import get_db
from backend.models.service_job import ServiceJob

router = APIRouter(prefix="/dispatch", tags=["dispatch"])

@router.post("/job")
def create_job(job_data: dict, db: Session = Depends(get_db)):
    job = ServiceJob(**job_data)
    db.add(job)
    db.commit()
    return {"id": job.id, "status": "created"}
