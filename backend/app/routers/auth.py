from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.core.db import get_db
from app.models.user import User
from app.core.jwt import create_access_token
from app.core.security import verify_password, get_password_hash

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

class LoginIn(BaseModel):
    email: str
    password: str

class LoginOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    tenant_id: str

@router.post("/login", response_model=LoginOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token({"sub": user.email, "role": user.role, "tenant_id": user.tenant_id})
    return {"access_token": token, "role": user.role, "tenant_id": user.tenant_id}
