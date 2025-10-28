from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers.auth import router as auth_router
from backend.routers.inventory import router as inventory_router
from backend.routers.dispatch import router as dispatch_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(inventory_router)
app.include_router(dispatch_router)

@app.get("/")
def root():
    return {"message": "PROJECTGA API v1"}
