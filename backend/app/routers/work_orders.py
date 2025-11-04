from fastapi import APIRouter
router = APIRouter(tags=["WorkOrders"])

@router.get("/work-orders")
async def list_work_orders():
    return {"work_orders": []}
