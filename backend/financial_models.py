from sqlalchemy import Column, Integer, String, Date
from app.core.db import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    amount_cents = Column(Integer, nullable=False, default=0)
    occurred_on = Column(Date, nullable=True)
    note = Column(String, nullable=True)


# === TEMPORARY STUB (Phase 3) ===
# Placeholder for RevenueCollectionRequest used in FinancialService
from typing import Optional
from pydantic import BaseModel

class RevenueCollectionRequest(BaseModel):
    tenant_id: str
    location_id: str
    collector_id: Optional[str] = None
    total_amount: float = 0.0
    cash_amount: float = 0.0
    ticket_amount: float = 0.0
    notes: Optional[str] = None
# === END TEMPORARY STUB ===

# === TEMPORARY STUB ===
# Placeholder for ExpenseSubmissionRequest used in FinancialService
from typing import Optional
from pydantic import BaseModel

class ExpenseSubmissionRequest(BaseModel):
    tenant_id: str
    submitted_by: str
    category: str
    amount: float
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    attachment_url: Optional[str] = None
# === END TEMPORARY STUB ===

# === TEMPORARY STUB ===
# Placeholder for InvoiceOCR used in FinancialService (OCR scan results)
from typing import Optional
from pydantic import BaseModel

class InvoiceOCR(BaseModel):
    invoice_id: Optional[str] = None
    vendor_name: Optional[str] = None
    invoice_date: Optional[str] = None
    total_amount: Optional[float] = 0.0
    tax_amount: Optional[float] = 0.0
    due_date: Optional[str] = None
    line_items: Optional[list] = None
    extracted_text: Optional[str] = None
    confidence_score: Optional[float] = None
# === END TEMPORARY STUB ===

# === TEMPORARY STUB ===
# Placeholder for AssetPerformance used in FinancialService
from typing import Optional
from pydantic import BaseModel

class AssetPerformance(BaseModel):
    asset_id: str
    asset_type: Optional[str] = None
    location_id: Optional[str] = None
    total_plays: int = 0
    total_revenue: float = 0.0
    net_profit: float = 0.0
    uptime_percent: float = 100.0
    last_service_date: Optional[str] = None
# === END TEMPORARY STUB ===

# === TEMPORARY STUB ===
# Placeholder for ProfitLossStatement used in FinancialService
from typing import Optional
from pydantic import BaseModel

class ProfitLossStatement(BaseModel):
    tenant_id: str
    period_start: str
    period_end: str
    total_revenue: float = 0.0
    total_expenses: float = 0.0
    gross_profit: float = 0.0
    net_profit: float = 0.0
    margin_percent: Optional[float] = None
    notes: Optional[str] = None
# === END TEMPORARY STUB ===

# === TEMPORARY STUB ===
# Placeholder for FinancialSummary used in FinancialService dashboard/report endpoints
from typing import Optional
from pydantic import BaseModel

class FinancialSummary(BaseModel):
    tenant_id: str
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    total_revenue: float = 0.0
    total_expenses: float = 0.0
    gross_profit: float = 0.0
    net_profit: float = 0.0
    cash_on_hand: float = 0.0
    outstanding_invoices: float = 0.0
    total_machines: int = 0
    total_locations: int = 0
    avg_revenue_per_machine: Optional[float] = None
    avg_revenue_per_location: Optional[float] = None
    margin_percent: Optional[float] = None
# === END TEMPORARY STUB ===

# === TEMPORARY STUB ===
# Placeholder for PredictiveInsights used in FinancialService
from typing import Optional
from pydantic import BaseModel

class PredictiveInsights(BaseModel):
    tenant_id: str
    forecast_period: Optional[str] = None  # e.g. "next_30_days"
    projected_revenue: float = 0.0
    projected_expenses: float = 0.0
    projected_profit: float = 0.0
    revenue_trend: Optional[str] = None  # "upward", "downward", "flat"
    expense_trend: Optional[str] = None
    confidence_score: float = 0.85
    notes: Optional[str] = None
# === END TEMPORARY STUB ===
