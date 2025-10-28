from fastapi import APIRouter
from reportlab.pdfgen import canvas
from fastapi.responses import StreamingResponse
import io

router = APIRouter(prefix="/vendor", tags=["vendor"])

@router.get("/po/{job_id}")
def generate_po(job_id: int):
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer)
    p.drawString(100, 800, f"Purchase Order for Job #{job_id}")
    p.drawString(100, 780, "Part: Coin Mech")
    p.drawString(100, 760, "Qty: 1")
    p.drawString(100, 740, "Vendor: ABC Parts")
    p.save()
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=po_{job_id}.pdf"})
