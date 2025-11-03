from sqlalchemy.orm import Session
from backend.app.core.db import SessionLocal
from backend.app.models.service_job import ServiceJob
from backend.app.models.job_audit import JobAudit
from datetime import datetime

def create_dummy_jobs():
    db: Session = SessionLocal()
    try:
        # Clear existing
        db.query(ServiceJob).delete()
        db.query(JobAudit).delete()

        # Dummy jobs
        jobs = [
            ServiceJob(machine_id=1, tenant_id=1, status="needs_followup", notes="Test job 1", needs_followup=False),
            ServiceJob(machine_id=2, tenant_id=1, status="completed", notes="Test job 2", needs_followup=False),
            ServiceJob(machine_id=3, tenant_id=1, status="pending", notes="Test job 3", needs_followup=False),
            ServiceJob(machine_id=4, tenant_id=1, status="needs_followup", notes="Urgent fix", needs_followup=True),
            ServiceJob(machine_id=5, tenant_id=1, status="completed", notes="Routine check", needs_followup=False),
        ]
        db.add_all(jobs)
        db.commit()

        # Dummy audit logs
        audit_logs = []
        for job in db.query(ServiceJob).all():
            audit_logs.append(JobAudit(job_id=job.id, user_id=1, action="created", timestamp=datetime.utcnow()))
            audit_logs.append(JobAudit(job_id=job.id, user_id=2, action="viewed", timestamp=datetime.utcnow()))
        db.add_all(audit_logs)
        db.commit()
        print("Dummy data created!")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_dummy_jobs()
