from fastapi import APIRouter
router = APIRouter(tags=["Auth"])

@router.post("/login")
async def login():
    return {"message": "login ok"}
