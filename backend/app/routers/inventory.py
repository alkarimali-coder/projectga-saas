from fastapi import APIRouter

router = APIRouter()

@router.get("/inventory")
@router.get("/inventory/")
def get_inventory():
    return {
        "machines": [
            {"id": 1, "name": "M001", "location": "Store A", "revenue": 239.25, "status": "active"}
        ]
    }
