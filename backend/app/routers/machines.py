from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models import Machine

router = APIRouter(prefix="/machines", tags=["Machines"])

# ✅ GET all machines
@router.get("")
def get_machines(db: Session = Depends(get_db)):
    machines = db.query(Machine).all()
    return {"machines": [
        {
            "id": m.id,
            "model": m.model,
            "manufacturer": m.manufacturer,
            "coam_id": m.coam_id,
            "qr_tag": m.qr_tag,
            "status": "Active"
        }
        for m in machines
    ]}

# ✅ POST to add a new machine
@router.post("")
def add_machine(machine: dict, db: Session = Depends(get_db)):
    required = ["model", "manufacturer", "coam_id", "qr_tag"]
    if not all(k in machine for k in required):
        raise HTTPException(status_code=400, detail="Missing required fields")

    new_machine = Machine(
        tenant_id="ML_00000",
        manufacturer=machine["manufacturer"],
        model=machine["model"],
        game=machine.get("game"),
        version=machine.get("version"),
        coam_id=machine["coam_id"],
        qr_tag=machine["qr_tag"]
    )
    db.add(new_machine)
    db.commit()
    db.refresh(new_machine)
    return {"message": "Machine added", "id": new_machine.id}
