from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.auth import router as auth_router
from app.routers.inventory import router as inventory_router

app = FastAPI()

# ---- CORS FIX ----
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to your Netlify URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(inventory_router)

@app.get("/")
def root():
    return {"message": "PROJECTGA API v1"}
