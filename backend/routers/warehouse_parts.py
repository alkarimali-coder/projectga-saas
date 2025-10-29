from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from backend.db.session import get_db
from backend.models.service_job import ServiceJob
from backend.models.job_audit import JobAudit
from sqlalchemy import select, extract, func, desc
from collections import defaultdict

router = APIRouter(prefix="/warehouse/parts", tags=["warehouse_parts"])

@router.get("/today")
async def parts_today(db: AsyncSession = Depends(get_db)):
    # Sub-query: latest audit per job
    latest_audit = (
        select(
            JobAudit.job_id,
            func.max(JobAudit.timestamp).label("max_ts")
        )
        .group_by(JobAudit.job_id)
        .subquery()
    )

    result = await db.execute(
        select(ServiceJob, JobAudit.user_id)
        .join(latest_audit, ServiceJob.id == latest_audit.c.job_id)
        .join(JobAudit, (ServiceJob.id == JobAudit.job_id) & (JobAudit.timestamp == latest_audit.c.max_ts))
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
