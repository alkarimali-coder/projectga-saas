from fastapi import APIRouter, Request, HTTPException

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me")
def me(request: Request):
    if not request.state.role:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"email": request.state.sub, "role": request.state.role, "tenant_id": request.state.tenant_id}

@router.get("/admin")
def admin_only(request: Request):
    if request.state.role != "SuperAdmin":
        raise HTTPException(status_code=403, detail="Forbidden")
    return {"ok": True, "message": "Admin access granted"}
