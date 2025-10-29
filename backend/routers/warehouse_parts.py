from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from backend.db.session import get_db
from backend.models.service_job import ServiceJob
from backend.models.job_audit import JobAudit
from sqlalchemy import select, extract, func
from collections import defaultdict

router = APIRouter(prefix="/warehouse/parts", tags=["warehouse_parts"])

@router.get("/today")
async def parts_today(db: AsyncSession = Depends(get_db)):
    # Get all jobs that were closed/followed-up today
    result = await db.execute(
        select(ServiceJob, JobAudit.user_id)
        .join(JobAudit, ServiceJob.id == JobAudit.job_id)
        .where(
            ServiceJob.status.in_(["approved_closed", "needs_followup"]),
            extract('year', JobAudit.timestamp) == func.extract('year', func.now()),
            extract('month', JobAudit.timestamp) == func.extract('month', func.now()),
            extract('day', JobAudit.timestamp) == func.extract('day', func.now())
        )
    )
    rows = result.all()

    report = defaultdict(list)
    for job, user_id in rows:
        parts = job.needs_followup if job.needs_followup else "None"
        report[user_id].append({
            "job_id": job.id,
            "machine_id": job.machine_id,
            "parts_needed": parts
        })

    return dict(report)
