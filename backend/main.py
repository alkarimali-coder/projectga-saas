from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.auth import router as auth_router
from routers.inventory import router as inventory_router

app = FastAPI()

# CORS Whitelist
origins = [
    "http://localhost:3000",
    "https://projectga.netlify.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*", "GET", "POST", "PUT", "DELETE"],
    allow_headers=["*", "Authorization", "Content-Type"],
)

# Audit Middleware (Logs every request)
@app.middleware("http")
async def audit_middleware(request, call_next):
    response = await call_next(request)
    from core.db import get_db
    from models.audit_log import AuditLog
    from datetime import datetime
    db = next(get_db())
    try:
        user = None
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            from core.security import verify_token
            token = auth_header.split(" ")[1]
            user = verify_token(token, db)
        audit = AuditLog(
            user_id=user.id if user else None,
            action=request.method,
            entity=request.url.path,
            entity_id=None,
            timestamp=datetime.utcnow(),
            tenant_id=getattr(user, 'tenant_id', None)
        )
        db.add(audit)
        db.commit()
    except Exception:
        pass  # Silent fail
    finally:
        db.close()
    return response

# Include routers
from routers.inventory import router as inventory_router
from routers.auth import router as auth_router
from routers.auth import router as auth_router
from routers.inventory import router as inventory_router
app.include_router(inventory_router)
app.include_router(auth_router)
from routers.inventory import router as inventory_router
app.include_router(inventory_router)
app.include_router(auth_router)
from routers.auth import router as auth_router
from routers.inventory import router as inventory_router
app.include_router(inventory_router)
app.include_router(auth_router)
from routers.inventory import router as inventory_router
app.include_router(inventory_router)
app.include_router(inventory_router)
from routers.auth import router as auth_router
from routers.auth import router as auth_router
from routers.inventory import router as inventory_router
app.include_router(inventory_router)
app.include_router(auth_router)
from routers.inventory import router as inventory_router
app.include_router(inventory_router)
app.include_router(auth_router)
from routers.auth import router as auth_router
from routers.inventory import router as inventory_router
app.include_router(inventory_router)
app.include_router(auth_router)
from routers.inventory import router as inventory_router
app.include_router(inventory_router)
app.include_router(auth_router)
from routers.inventory import router as inventory_router
from routers.auth import router as auth_router
from routers.auth import router as auth_router
from routers.inventory import router as inventory_router
app.include_router(inventory_router)
app.include_router(auth_router)
from routers.inventory import router as inventory_router
app.include_router(inventory_router)
app.include_router(auth_router)
from routers.auth import router as auth_router
from routers.inventory import router as inventory_router
app.include_router(inventory_router)
app.include_router(auth_router)
from routers.inventory import router as inventory_router
app.include_router(inventory_router)
app.include_router(inventory_router)
from routers.auth import router as auth_router
from routers.auth import router as auth_router
from routers.inventory import router as inventory_router
app.include_router(inventory_router)
app.include_router(auth_router)
from routers.inventory import router as inventory_router
app.include_router(inventory_router)
app.include_router(auth_router)
from routers.auth import router as auth_router
from routers.inventory import router as inventory_router
app.include_router(inventory_router)
app.include_router(auth_router)
from routers.inventory import router as inventory_router
app.include_router(inventory_router)
app.include_router(inventory_router)

@app.get("/")
def root():
    return {"message": "PROJECTGA API v1"}
