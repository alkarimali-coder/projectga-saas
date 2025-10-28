from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.db.session import get_db
from backend.models.service_job import ServiceJob

router = APIRouter(prefix="/warehouse", tags=["warehouse"])

@router.get("/jobs")
def get_jobs(db: Session = Depends(get_db)):
    jobs = db.query(ServiceJob).filter(ServiceJob.status == "pending").all()
    return [{"id": j.id, "machine_id": j.machine_id, "notes": j.notes} for j in jobs]

@router.post("/fulfill/{job_id}")
def fulfill_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(ServiceJob).filter(ServiceJob.id == job_id).first()
    job.status = "fulfilled"
    db.commit()
    return {"status": "fulfilled"}
