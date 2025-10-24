from pydantic import BaseModel, Field, field_serializer
from typing import List, Optional, Dict, Any, Union
from enum import Enum
from datetime import datetime, timezone, date
import uuid


# Financial Enums
class TransactionType(str, Enum):
    REVENUE = "revenue"
    EXPENSE = "expense"
    COMMISSION = "commission"
    COLLECTION = "collection"
    REFUND = "refund"
    ADJUSTMENT = "adjustment"


class RevenueSource(str, Enum):
    MACHINE_PLAY = "machine_play"
    JACKPOT = "jackpot"
    BONUS = "bonus"
    TOURNAMENT = "tournament"
    OTHER = "other"


class ExpenseCategory(str, Enum):
    MAINTENANCE = "maintenance"
    PARTS = "parts"
    LABOR = "labor"
    TRANSPORTATION = "transportation"
    UTILITIES = "utilities"
    RENT = "rent"
    INSURANCE = "insurance"
    TAXES = "taxes"
    ADMINISTRATIVE = "administrative"
    OTHER = "other"


class CommissionType(str, Enum):
    LOCATION_SHARE = "location_share"  # Location owner's percentage
    ML_SHARE = "ml_share"  # Master Licensee's percentage
    TECH_BONUS = "tech_bonus"  # Technician performance bonus
    REFERRAL = "referral"  # Referral commissions
    OTHER = "other"


class ReportType(str, Enum):
    REVENUE_SUMMARY = "revenue_summary"
    EXPENSE_REPORT = "expense_report"
    P_AND_L = "p_and_l"
    COMMISSION_REPORT = "commission_report"
    ASSET_PERFORMANCE = "asset_performance"
    LOCATION_PERFORMANCE = "location_performance"
    CUSTOM = "custom"


class ReportFormat(str, Enum):
    PDF = "pdf"
    EXCEL = "excel"
    CSV = "csv"
    JSON = "json"


# Financial Transaction Models
class FinancialTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    transaction_type: TransactionType
    reference_id: Optional[str] = None  # job_id, machine_id, etc.
    reference_type: Optional[str] = None  # "job", "machine", "location"

    # Core transaction data
    amount: float
    currency: str = "USD"
    description: str
    category: Optional[str] = None

    # Entity relationships
    machine_id: Optional[str] = None
    location_id: Optional[str] = None
    user_id: Optional[str] = None  # Who performed/recorded the transaction

    # Revenue specific fields
    revenue_source: Optional[RevenueSource] = None
    collection_date: Optional[datetime] = None

    # Expense specific fields
    expense_category: Optional[ExpenseCategory] = None
    vendor_id: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[date] = None

    # Commission specific fields
    commission_type: Optional[CommissionType] = None
    commission_rate: Optional[float] = None  # Percentage
    base_amount: Optional[float] = None  # Amount commission is calculated from

    # OCR and file data
    ocr_data: Optional[Dict[str, Any]] = None
    file_attachments: List[str] = Field(default_factory=list)

    # Metadata
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    is_verified: bool = False
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None

    # Audit fields
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RevenueEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    machine_id: str
    location_id: str

    # Revenue data
    gross_revenue: float
    net_revenue: float  # After location commission
    ml_share: float  # Master Licensee's portion
    location_share: float  # Location owner's portion

    # Collection details
    collection_date: date
    collection_method: str  # "cash", "digital", "mixed"
    collected_by: str  # user_id of collector

    # Breakdown by revenue source
    revenue_breakdown: Dict[RevenueSource, float] = Field(default_factory=dict)

    # Verification
    is_verified: bool = False
    verified_by: Optional[str] = None
    variance_notes: Optional[str] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_serializer("collection_date")
    def serialize_collection_date(self, v: date, _info):
        return v.isoformat()


class ExpenseEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str

    # Expense data
    amount: float
    category: ExpenseCategory
    subcategory: Optional[str] = None
    description: str

    # Entity relationships
    machine_id: Optional[str] = None
    location_id: Optional[str] = None
    job_id: Optional[str] = None
    vendor_id: Optional[str] = None

    # Invoice data
    invoice_number: Optional[str] = None
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    paid_date: Optional[date] = None

    # OCR processed data
    ocr_confidence: Optional[float] = None
    ocr_raw_text: Optional[str] = None
    ocr_structured_data: Optional[Dict[str, Any]] = None

    # Approval workflow
    requires_approval: bool = False
    is_approved: bool = False
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None

    # Files and attachments
    receipt_files: List[str] = Field(default_factory=list)

    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_serializer("invoice_date")
    def serialize_invoice_date(self, v: Optional[date], _info):
        return v.isoformat() if v else None

    @field_serializer("due_date")
    def serialize_due_date(self, v: Optional[date], _info):
        return v.isoformat() if v else None

    @field_serializer("paid_date")
    def serialize_paid_date(self, v: Optional[date], _info):
        return v.isoformat() if v else None


class CommissionEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str

    # Commission details
    commission_type: CommissionType
    recipient_id: str  # user_id or location_id
    recipient_type: str  # "user", "location", "vendor"

    # Calculation data
    base_amount: float  # Revenue/amount commission is based on
    commission_rate: float  # Percentage (0.15 = 15%)
    commission_amount: float  # Calculated commission

    # Time period
    period_start: date
    period_end: date

    # Entity relationships
    machine_id: Optional[str] = None
    location_id: Optional[str] = None

    # Payment details
    is_paid: bool = False
    paid_date: Optional[date] = None
    payment_method: Optional[str] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_serializer("period_start")
    def serialize_period_start(self, v: date, _info):
        return v.isoformat()

    @field_serializer("period_end")
    def serialize_period_end(self, v: date, _info):
        return v.isoformat()

    @field_serializer("paid_date")
    def serialize_paid_date(self, v: Optional[date], _info):
        return v.isoformat() if v else None


# Analytics and Reporting Models
class AssetPerformance(BaseModel):
    asset_id: str
    asset_name: str
    coam_id: str
    location_id: str
    location_name: str

    # Financial metrics
    total_revenue: float
    total_expenses: float
    net_profit: float
    roi_percentage: float

    # Operational metrics
    uptime_percentage: float
    service_frequency: float
    age_months: int

    # Performance indicators
    revenue_per_day: float
    revenue_trend: str  # "increasing", "decreasing", "stable"
    performance_rank: int  # 1 = best performing
    performance_category: str  # "top", "average", "underperforming"

    # Predictive insights
    predicted_monthly_revenue: float
    replacement_recommendation: str
    optimization_suggestions: List[str] = Field(default_factory=list)

    period_start: date
    period_end: date
    calculated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_serializer("period_start")
    def serialize_period_start(self, v: date, _info):
        return v.isoformat()

    @field_serializer("period_end")
    def serialize_period_end(self, v: date, _info):
        return v.isoformat()


class LocationPerformance(BaseModel):
    location_id: str
    location_name: str

    # Financial summary
    total_revenue: float
    total_expenses: float
    net_profit: float
    average_machine_roi: float

    # Machine metrics
    total_machines: int
    active_machines: int
    top_performing_machine_id: Optional[str] = None
    worst_performing_machine_id: Optional[str] = None

    # Performance indicators
    revenue_per_machine: float
    location_commission_paid: float
    performance_trend: str

    period_start: date
    period_end: date


class ProfitLossStatement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str

    # Time period
    period_start: date
    period_end: date
    period_type: str  # "daily", "weekly", "monthly", "quarterly", "yearly"

    @field_serializer("period_start")
    def serialize_period_start(self, v: date, _info):
        return v.isoformat()

    @field_serializer("period_end")
    def serialize_period_end(self, v: date, _info):
        return v.isoformat()

    # Revenue breakdown
    gross_revenue: float
    revenue_by_source: Dict[str, float] = Field(default_factory=dict)
    revenue_by_location: Dict[str, float] = Field(default_factory=dict)
    revenue_by_machine: Dict[str, float] = Field(default_factory=dict)

    # Expense breakdown
    total_expenses: float
    expenses_by_category: Dict[str, float] = Field(default_factory=dict)

    # Commission breakdown
    total_commissions_paid: float
    commissions_by_type: Dict[str, float] = Field(default_factory=dict)

    # Calculated metrics
    gross_profit: float
    net_profit: float
    gross_margin_percentage: float
    net_margin_percentage: float

    # Additional insights
    top_revenue_machine: Optional[str] = None
    top_revenue_location: Optional[str] = None
    highest_expense_category: Optional[str] = None

    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    generated_by: str


# Dashboard and Reporting Models
class DashboardWidget(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    widget_type: str  # "revenue_chart", "expense_breakdown", "top_machines", etc.
    title: str
    position: Dict[str, int]  # {"x": 0, "y": 0, "width": 4, "height": 2}
    config: Dict[str, Any] = Field(default_factory=dict)
    data_filters: Dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True


class CustomDashboard(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    user_id: str
    name: str
    description: Optional[str] = None
    widgets: List[DashboardWidget] = Field(default_factory=list)
    is_default: bool = False
    is_shared: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ReportTemplate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    name: str
    report_type: ReportType
    description: Optional[str] = None

    # Report configuration
    data_sources: List[str] = Field(default_factory=list)
    filters: Dict[str, Any] = Field(default_factory=dict)
    grouping: List[str] = Field(default_factory=list)
    sorting: List[Dict[str, str]] = Field(default_factory=list)

    # Formatting options
    format_settings: Dict[str, Any] = Field(default_factory=dict)
    chart_configs: List[Dict[str, Any]] = Field(default_factory=list)

    # Scheduling
    is_scheduled: bool = False
    schedule_config: Optional[Dict[str, Any]] = None

    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class GeneratedReport(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    template_id: Optional[str] = None

    name: str
    report_type: ReportType
    format: ReportFormat

    # Report content
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    data: Optional[Dict[str, Any]] = None

    # Generation details
    period_start: date
    period_end: date
    filters_applied: Dict[str, Any] = Field(default_factory=dict)

    # Status
    status: str = "completed"  # "pending", "generating", "completed", "failed"
    error_message: Optional[str] = None

    generated_by: str
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None


# OCR and Invoice Processing Models
class InvoiceOCR(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str

    # File information
    file_path: str
    file_name: str
    file_size: int

    # OCR processing results
    raw_text: str
    confidence_score: float
    processing_time_ms: int

    # Extracted structured data
    vendor_name: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    total_amount: Optional[float] = None
    tax_amount: Optional[float] = None
    line_items: List[Dict[str, Any]] = Field(default_factory=list)

    # Validation and corrections
    is_validated: bool = False
    validated_by: Optional[str] = None
    corrections: Dict[str, Any] = Field(default_factory=dict)

    # Processing metadata
    ocr_engine_version: str = "tesseract-5.0"
    processing_notes: Optional[str] = None

    processed_by: str
    processed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Request/Response Models for API
class RevenueCollectionRequest(BaseModel):
    machine_id: str
    collection_date: date
    gross_amount: float
    collection_method: str = "cash"
    notes: Optional[str] = None
    photo_attachments: List[str] = Field(default_factory=list)


class ExpenseSubmissionRequest(BaseModel):
    amount: float
    category: ExpenseCategory
    description: str
    machine_id: Optional[str] = None
    location_id: Optional[str] = None
    job_id: Optional[str] = None
    invoice_photo: Optional[str] = None  # File path or base64
    receipt_photos: List[str] = Field(default_factory=list)


class FinancialReportRequest(BaseModel):
    report_type: ReportType
    period_start: date
    period_end: date
    format: ReportFormat = ReportFormat.PDF
    filters: Dict[str, Any] = Field(default_factory=dict)
    include_charts: bool = True
    group_by: List[str] = Field(default_factory=list)


class DashboardDataRequest(BaseModel):
    widget_types: List[str]
    period_start: date
    period_end: date
    filters: Dict[str, Any] = Field(default_factory=dict)


# Analytics Response Models
class RevenueAnalytics(BaseModel):
    total_revenue: float
    revenue_growth: float  # Percentage change from previous period
    revenue_by_day: List[
        Dict[str, Union[str, float]]
    ]  # [{"date": "2025-01-01", "amount": 1500.00}]
    revenue_by_source: Dict[str, float]
    top_performing_machines: List[Dict[str, Any]]
    revenue_forecast: List[Dict[str, Union[str, float]]]  # Next 30 days prediction


class ExpenseAnalytics(BaseModel):
    total_expenses: float
    expense_growth: float
    expenses_by_category: Dict[str, float]
    expense_trends: List[Dict[str, Union[str, float]]]
    cost_per_machine: float
    upcoming_expenses: List[Dict[str, Any]]  # Pending invoices, scheduled maintenance


class ProfitabilityAnalytics(BaseModel):
    gross_profit: float
    net_profit: float
    profit_margin: float
    roi_by_machine: List[Dict[str, Any]]
    break_even_analysis: Dict[str, Any]
    profitability_trends: List[Dict[str, Union[str, float]]]


class PredictiveInsights(BaseModel):
    revenue_forecast_30_days: float
    expense_forecast_30_days: float
    predicted_profit: float

    # Machine insights
    machines_needing_attention: List[Dict[str, Any]]
    optimization_opportunities: List[Dict[str, Any]]
    replacement_candidates: List[Dict[str, Any]]

    # Location insights
    underperforming_locations: List[Dict[str, Any]]
    expansion_opportunities: List[Dict[str, Any]]

    confidence_level: float
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class FinancialSummary(BaseModel):
    period_start: date
    period_end: date

    @field_serializer("period_start")
    def serialize_period_start(self, v: date, _info):
        return v.isoformat()

    @field_serializer("period_end")
    def serialize_period_end(self, v: date, _info):
        return v.isoformat()

    # High-level metrics
    total_revenue: float
    total_expenses: float
    net_profit: float
    profit_margin: float

    # Growth metrics
    revenue_growth: float
    expense_growth: float
    profit_growth: float

    # Machine metrics
    total_machines: int
    revenue_per_machine: float
    profit_per_machine: float

    # Top performers
    top_machine: Optional[Dict[str, Any]] = None
    top_location: Optional[Dict[str, Any]] = None

    # Alerts and insights
    financial_alerts: List[str] = Field(default_factory=list)
    key_insights: List[str] = Field(default_factory=list)
