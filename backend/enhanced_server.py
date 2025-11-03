"""
Enhanced COAM SaaS Server (SQLAlchemy-first, no Mongo)
- Removes Motor/Mongo usage
- Keeps security headers middleware
- Includes existing routers (both app/routers and root routers if they exist)
"""

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.cors import CORSMiddleware
from pathlib import Path
import os
import logging
from datetime import datetime, timezone

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent

# ──────────────────────────────────────────────────────────────────────────────
# Minimal Security Middleware (headers + simple rate-limit stub headers)
# ──────────────────────────────────────────────────────────────────────────────
class SecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        # Rate-limit stub headers (real limiter added later in Phase 3)
        response.headers["X-RateLimit-Limit"] = "100"
        response.headers["X-RateLimit-Remaining"] = "99"
        return response

# ──────────────────────────────────────────────────────────────────────────────
# FastAPI app
# ──────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="COAM SaaS API",
    version="2.0.0",
    description="COAM route management SaaS (SQLAlchemy-only; Phase 3 groundwork)"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security headers
app.add_middleware(SecurityMiddleware)

# Uploads (static)
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# ──────────────────────────────────────────────────────────────────────────────
# Health endpoint
# ──────────────────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}

# ──────────────────────────────────────────────────────────────────────────────
# Router inclusion
# We try to include both app/routers/* and top-level routers/* if present
# without failing if one set is missing.
# ──────────────────────────────────────────────────────────────────────────────
def _include_router_safely(module_path: str, router_name: str = "router", prefix: str = ""):
    try:
        mod = __import__(module_path, fromlist=[router_name])
        router = getattr(mod, router_name, None)
        if router is not None:
            app.include_router(router, prefix=prefix)
            logger.info(f"✓ Included router: {module_path}")
        else:
            logger.info(f"• Found module but no 'router' in {module_path}")
    except Exception as e:
        logger.info(f"• Skipped router {module_path}: {e}")

# Common routers (adjust or add more as you need)
possible_modules = [
    # Newer layout under app/routers
    "app.routers.auth",
    "app.routers.inventory",
    "app.routers.dispatch",
    "app.routers.warehouse",
    "app.routers.vendor",
    # Legacy/top-level routers
    "routers.auth",
    "routers.inventory",
    "routers.dispatch",
    "routers.warehouse",
    "routers.vendor",
]

for mod in possible_modules:
    _include_router_safely(mod, router_name="router", prefix="/api")

# Fallback: if none of the above exist, at least expose a basic info endpoint
@app.get("/api")
async def api_index():
    return {
        "message": "COAM SaaS API",
        "routers": "auth, inventory, dispatch, warehouse, vendor (included if present)",
    }

# ──────────────────────────────────────────────────────────────────────────────
# Error handler example (keeps responses consistent)
# ──────────────────────────────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def unhandled_exc_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}")
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# Uvicorn launcher
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("enhanced_server:app", host="0.0.0.0", port=8000, reload=True)
