from fastapi import APIRouter
router = APIRouter(tags=["Inventory"])

@router.get("/inventory")
async def list_inventory():
    return {"inventory": []}
