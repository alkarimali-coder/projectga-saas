from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from backend.db.session import get_db
from backend.models.service_job import ServiceJob

router = APIRouter(prefix="/dispatch", tags=["dispatch"])

@router.post("/job")
async def create_job(job_data: dict, db: AsyncSession = Depends(get_db)):
    # Convert machine_id to int if possible, else keep as string
    if "machine_id" in job_data:
        try:
            job_data["machine_id"] = int(job_data["machine_id"])
        except (ValueError, TypeError):
            pass  # keep as string
    job_data.setdefault("tenant_id", 1)
    job = ServiceJob(**job_data)
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return {"id": job.id, "status": "created"}
