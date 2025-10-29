from fastapi import FastAPI
from backend.routers import auth, dispatch, warehouse
from backend.routers.field_tech import router as field_tech_router  # <-- ADD THIS

app = FastAPI()

app.include_router(auth.router)
app.include_router(dispatch.router)
app.include_router(warehouse.router)
app.include_router(field_tech_router)  # <-- ADD THIS

from backend.routers.dispatch_review import router as dispatch_review_router
app.include_router(dispatch_review_router)
