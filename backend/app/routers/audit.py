from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from backend.app.core.db import get_db
from backend.app.utils.cache import cached
import csv
from io import StringIO

router = APIRouter(prefix="/audit")

@router.get("/")
@cached(ttl=60)
async def get_audit(db: Session = Depends(get_db)):
    from backend.app.models.job_audit import JobAudit
    logs = db.query(JobAudit).order_by(JobAudit.timestamp.desc()).limit(100).all()
    return [log.dict() for log in logs]

@router.get("/export")
async def export_audit(db: Session = Depends(get_db)):
    from backend.app.models.job_audit import JobAudit
    logs = db.query(JobAudit).order_by(JobAudit.timestamp.desc()).all()
    
    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=["id", "job_id", "user_id", "action", "timestamp"])
    writer.writeheader()
    for log in logs:
        writer.writerow(log.dict())
    
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=audit_log.csv"}
    )
