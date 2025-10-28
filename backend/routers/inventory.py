from fastapi import APIRouter, UploadFile, File
from backend.core.s3 import upload_file

router = APIRouter(prefix="/inventory", tags=["inventory"])

@router.post("/upload")
async def upload_photo(file: UploadFile = File(...)):
    url = upload_file(file.file, "projectga-photos", file.filename)
    if url:
        return {"url": url}
    return {"error": "Upload failed"}
