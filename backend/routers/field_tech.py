from sqlalchemy import select
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from backend.db.session import get_db
from backend.models.service_job import ServiceJob
from backend.models.job_audit import JobAudit
import json

router = APIRouter(prefix="/fieldtech", tags=["fieldtech"])

@router.post("/complete/{job_id}")
async def complete_job(job_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ServiceJob).where(ServiceJob.id == job_id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Job not found")
    
    old_status = job.status
    job.status = "completed_pending_review"
    job.notes = data.get("notes", job.notes)
    job.photos = json.dumps(data.get("photos", []))
    job.needs_followup = data.get("needs_followup")  # "yes" + parts or "no"

    # Audit
    audit = JobAudit(
        job_id=job.id,
        old_status=old_status,
        new_status=job.status,
        user_id=data.get("user_id", 0)
    )
    db.add(audit)

    await db.commit()
    await db.refresh(job)
    return {"status": "completed_pending_review"}
