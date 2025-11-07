from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/api/v1/ai", tags=["ai"])

class AIQuery(BaseModel):
    query: str

class AIAnswer(BaseModel):
    answer: str
    suggestions: List[str] = []

DUMMY = [
    {"answer": "CORE here. Try filtering Work Orders by 'Pending' to see today’s action items.", "suggestions": ["Open Work Orders", "New Work Order", "View Machines"]},
    {"answer": "Need dispatch help? Assign a tech and set priority to High.", "suggestions": ["Assign Tech", "Set Priority", "View Tech Schedule"]},
    {"answer": "Inventory low alerts can be enabled in System Settings later.", "suggestions": ["Open System Settings", "Parts Catalog", "Vendors"]},
]

@router.post("/query", response_model=AIAnswer)
def ai_query(q: AIQuery):
    idx = abs(hash(q.query)) % len(DUMMY)
    return DUMMY[idx]
