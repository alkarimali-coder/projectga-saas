from sqlalchemy.orm import Session
from backend.app.models.service_job import ServiceJob, ServiceJobCreate

async def create_service_job(db: Session, job: ServiceJobCreate):
    db_job = ServiceJob(**job.dict())
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job
