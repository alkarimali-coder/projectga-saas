from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from backend.db.session import get_db
from backend.models.service_job import ServiceJob
from backend.models.job_audit import JobAudit
from sqlalchemy import select
import json

router = APIRouter(prefix="/dispatch/review", tags=["dispatch_review"])

@router.get("/pending")
async def get_pending_reviews(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ServiceJob).where(ServiceJob.status == "completed_pending_review")
    )
    jobs = result.scalars().all()
    return [
        {
            "id": j.id,
            "machine_id": j.machine_id,
            "notes": j.notes,
            "photos": json.loads(j.photos) if j.photos else [],
            "needs_followup": j.needs_followup
        } for j in jobs
    ]

@router.post("/approve/{job_id}")
async def approve_job(job_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ServiceJob).where(ServiceJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Job not found")

    old_status = job.status
    job.status = "approved_closed"
    
    audit = JobAudit(
        job_id=job.id,
        old_status=old_status,
        new_status=job.status,
        user_id=data.get("user_id", 0)
    )
    db.add(audit)
    await db.commit()
    return {"status": "approved_closed"}

@router.post("/followup/{job_id}")
async def create_followup(job_id: int, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ServiceJob).where(ServiceJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Job not found")

    # Create new job
    new_job = ServiceJob(
        machine_id=job.machine_id,
        tenant_id=job.tenant_id,
        status="open",
        notes=f"Follow-up: {data.get('notes', '')}"
        # Do NOT set needs_followup on new job
    )
    db.add(new_job)

    # Mark original as needs_followup
    old_status = job.status
    job.status = "needs_followup"
    audit = JobAudit(
        job_id=job.id,
        old_status=old_status,
        new_status=job.status,
        user_id=data.get("user_id", 0)
    )
    db.add(audit)

    await db.commit()
    await db.refresh(new_job)
    return {"followup_id": new_job.id, "status": "follow-up created"}
