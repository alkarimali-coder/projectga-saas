from fastapi import FastAPI
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.core.rate_limits import limiter

from app.routers import auth, machines, work_orders, inventory

API_PREFIX = "/api/v1"

app = FastAPI(title="PROJECTGA API", version="1.0")

# --- Rate limiting
app.state.limiter = limiter
app.add_exception_handler(
    RateLimitExceeded,
    lambda request, exc: JSONResponse(
        status_code=429, content={"detail": "Too many requests, please slow down."}
    ),
)
app.add_middleware(SlowAPIMiddleware)

# --- Routers with versioned prefix
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(machines.router, prefix=API_PREFIX)
app.include_router(work_orders.router, prefix=API_PREFIX)
app.include_router(inventory.router, prefix=API_PREFIX)

@app.get(f"{API_PREFIX}/ai/query")
async def core_status():
    return {"status": "online"}

# === Phase 3 Additions ===
from app.routers.system_settings import router as system_settings_router
from app.routers.roles import router as roles_router
from app.routers.core_policy import router as core_policy_router
from app.services.settings_cache import settings_cache

@app.on_event("startup")
async def on_startup():
    # Load live system settings into cache at startup
    try:
        settings_cache.load()
        print("✅ System settings cache loaded.")
    except Exception as e:
        print("⚠️ Failed to load system settings cache:", e)

# Register Phase 3 routers
app.include_router(system_settings_router)
app.include_router(roles_router)
app.include_router(core_policy_router)
# === End of Phase 3 Additions ===
