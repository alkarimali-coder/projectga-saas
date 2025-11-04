from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.services.permissions import require_roles
from app.services.settings_cache import settings_cache

router = APIRouter(prefix="/api/v1/system/settings", tags=["System Settings"])


# --- Data Models ---
class SettingsPatch(BaseModel):
    api_version: Optional[str] = None
    enable_rate_limiting: Optional[bool] = None
    maintenance_mode: Optional[bool] = None
    custom_message: Optional[str] = None
    updated_by: Optional[str] = None


# --- Routes ---
@router.get("/", dependencies=[Depends(require_roles("SuperAdmin"))])
async def get_system_settings():
    """Retrieve current live system settings from cache."""
    try:
        data = settings_cache.get_all()
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/", dependencies=[Depends(require_roles("SuperAdmin"))])
async def update_system_settings(request: Request, patch: SettingsPatch):
    """Update one or more system-wide settings (SuperAdmin only)."""
    try:
        update_data = patch.dict(exclude_none=True)
        if not update_data:
            raise HTTPException(status_code=400, detail="No valid fields to update.")

        # Apply changes
        for key, value in update_data.items():
            settings_cache.set(key, value)

        return {
            "success": True,
            "message": "Settings updated successfully.",
            "updated": update_data,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reload", dependencies=[Depends(require_roles("SuperAdmin"))])
async def reload_settings():
    """Force reload settings from database into cache."""
    try:
        settings_cache.load()
        return {"success": True, "message": "Settings reloaded from DB."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
