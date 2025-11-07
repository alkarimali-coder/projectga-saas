from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import machines

app = FastAPI(title="COAM SaaS API", version="1.0.0")

# ✅ CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"

# ✅ Health check route
@app.get(f"{API_PREFIX}/health")
def health_check():
    return {"status": "ok"}

# ✅ Include machine router
app.include_router(machines.router, prefix=API_PREFIX)
