from sqlalchemy.orm import Session
from fastapi import Request
from datetime import datetime
from app.core.db import SessionLocal
from app.models.job_audit import JobAudit

async def log_forbidden(request: Request, user, reason: str, required: list):
    db: Session = SessionLocal()
    try:
        entry = JobAudit(
            actor_email=getattr(user, "email", "unknown"),
            actor_role=getattr(user, "role", "unknown"),
            method=request.method,
            path=request.url.path,
            status_code=403,
            reason=reason,
            required_roles=",".join(required),
            created_at=datetime.utcnow(),
        )
        db.add(entry)
        db.commit()
    finally:
        db.close()
