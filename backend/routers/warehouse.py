from sqlalchemy import select
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from backend.db.session import get_db
from backend.models.service_job import ServiceJob

router = APIRouter(prefix="/warehouse", tags=["warehouse"])

@router.get("/jobs")
async def get_jobs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ServiceJob).where(ServiceJob.status == "pending")
    )
    jobs = result.scalars().all()
    return [{"id": j.id, "machine_id": j.machine_id, "notes": j.notes} for j in jobs]

@router.post("/fulfill/{job_id}")
async def fulfill_job(job_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ServiceJob).where(ServiceJob.id == job_id)
    )
    job = result.scalar_one_or_none()
    if job:
        job.status = "fulfilled"
        await db.commit()
        await db.refresh(job)
    return {"status": "fulfilled"}
