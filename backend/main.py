from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import database
from core_models import User
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext

app = FastAPI(title="PROJECTGA - Multi-Tenant COAM SaaS")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = "projectga-super-secret-2025"
ALGORITHM = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"])

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

def create_token(data):
    expire = datetime.utcnow() + timedelta(minutes=30)
    data["exp"] = expire
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

# MULTI-TENANT: Machines per Master License
machines_db = {
    "ML001": [  # Atlanta Operator
        {"id": "M001", "location": "Atlanta", "type": "Slot", "status": "active", "revenue": 150},
        {"id": "M002", "location": "Macon", "type": "Poker", "status": "active", "revenue": 89}
    ],
    "ML002": [  # Savannah Operator
        {"id": "S001", "location": "Savannah", "type": "Pinball", "status": "maintenance", "revenue": 0}
    ]
}

@app.get("/")
async def root():
    return {"message": "🎰 PROJECTGA Multi-Tenant COAM SaaS", "tenants": list(machines_db.keys())}

@app.post("/auth/login")
async def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")
    
    token = create_token({"email": user.email, "role": user.role, "ml": "ML001"})
    return {
        "access_token": token, 
        "user": {"email": user.email, "role": user.role, "master_license": "ML001"}
    }

@app.get("/inventory")
async def get_machines(token: str = Depends(lambda: "dummy")):
    # Multi-tenant: Return ML001 machines
    return machines_db["ML001"]

@app.get("/health")
async def health():
    return {"status": "healthy", "multi_tenant": True}
