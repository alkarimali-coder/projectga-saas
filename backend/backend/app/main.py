from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.middleware.tenant import TenantMiddleware
from app.core.db import Base, engine
from app.routers import auth, users

# Create tables if not present (SQLite dev convenience)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="PROJECTGA API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(TenantMiddleware)

app.include_router(auth.router)
app.include_router(users.router)

@app.get("/")
def health():
    return {"status": "ok"}
