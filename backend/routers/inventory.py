from fastapi import APIRouter, Depends
from core.security import get_current_active_user

router = APIRouter()

@router.get("/inventory")
@router.get("/inventory/")
async def get_inventory(user=Depends(get_current_active_user)):
    return {
        "machines": [
            {"id": 1, "name": "M001", "location": "Store A", "revenue": 239.25, "status": "active"}
        ]
    }
