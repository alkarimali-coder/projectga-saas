from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import JSONResponse
import pandas as pd
from io import BytesIO
from backend.app.core.db import get_db
from sqlalchemy.orm import Session
import uuid

router = APIRouter(prefix="/import")

@router.post("/csv")
async def import_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(400, "Only CSV allowed")
    content = await file.read()
    df = pd.read_csv(BytesIO(content))
    return {"rows": len(df), "columns": list(df.columns)}
