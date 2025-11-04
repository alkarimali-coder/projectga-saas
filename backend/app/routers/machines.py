from fastapi import APIRouter
router = APIRouter(tags=["Machines"])

@router.get("/machines")
async def list_machines():
    return {"machines": []}
