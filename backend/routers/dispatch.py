from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from backend.db.session import get_db
from backend.models.service_job import ServiceJob

router = APIRouter(prefix="/dispatch", tags=["dispatch"])

@router.post("/job")
async def create_job(job_data: dict, db: AsyncSession = Depends(get_db)):
    # Default tenant if not provided
    job_data.setdefault('tenant_id', 1)
    job = ServiceJob(**job_data)
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return {"id": job.id, "status": "created"}
