from fastapi import APIRouter

router = APIRouter(prefix="/inventory", tags=["inventory"])

@router.get("/")
def get_inventory():
    return [{"id": 1, "name": "M001", "revenue": 239.25}]
