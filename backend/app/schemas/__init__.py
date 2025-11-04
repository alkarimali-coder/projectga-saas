from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from enum import Enum

# ==========  UNIVERSAL / SYSTEM  ==========
class SystemSetting(BaseModel):
    key: str
    value: Any
    description: Optional[str] = None


# ==========  NOTIFICATION MODELS  ==========
class CreateNotificationRequest(BaseModel):
    title: str
    message: str
    tenant_id: Optional[str] = None
    priority: str = "normal"


class NotificationType(str):
    EMAIL = "email"
    SMS = "sms"
    IN_APP = "in_app"
    WEBHOOK = "webhook"


class LocationNotificationSettings(BaseModel):
    location_id: str
    enabled_channels: Dict[str, bool]


class NotificationChannel(BaseModel):
    type: str
    enabled: bool


class WebhookDeliveryRecord(BaseModel):
    id: Optional[str]
    url: str
    status: str
    response_code: Optional[int] = None
    created_at: datetime = datetime.utcnow()


class NotificationStatsResponse(BaseModel):
    total_sent: int = 0
    total_failed: int = 0
    total_pending: int = 0
    total_read: int = 0


class UpdateNotificationSettingsRequest(BaseModel):
    tenant_id: str
    enabled_channels: Optional[Dict[str, bool]] = None
    frequency: Optional[str] = "immediate"
    do_not_disturb: Optional[Dict[str, Any]] = None
    alert_thresholds: Optional[Dict[str, float]] = None


# ==========  AUTOMATION MODELS  ==========
class RenewalItem(BaseModel):
    id: Optional[str]
    tenant_id: str
    item_type: str
    item_name: Optional[str] = None
    expiration_date: datetime
    renewal_status: str = "pending"
    assigned_to: Optional[str] = None
    last_notified_at: Optional[datetime] = None
    notes: Optional[str] = None


# ==========  FINANCIAL MODELS  ==========
class InvoiceOCR(BaseModel):
    vendor: Optional[str]
    total: float
    date: datetime
    items: List[str] = []


class AssetPerformance(BaseModel):
    machine_id: str
    revenue: float
    uptime_percent: float


class ProfitLossStatement(BaseModel):
    total_revenue: float
    total_expense: float
    net_profit: float


class FinancialSummary(BaseModel):
    month: str
    revenue: float
    expense: float
    net: float


class PredictiveInsights(BaseModel):
    risk_score: float
    forecasted_growth: float
    recommendations: List[str]


# ==========  MISC PLACEHOLDERS  ==========
class ExpenseSubmissionRequest(BaseModel):
    description: str
    amount: float
    date: datetime


class RevenueCollectionRequest(BaseModel):
    amount: float
    date: datetime
    collector_id: str


class VendorPickup(BaseModel):
    vendor_id: str
    items: List[str]


class RMA(BaseModel):
    item_id: str
    issue_description: str
    status: str


class AlertType(str):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class InventoryLocation(BaseModel):
    id: str
    name: str
    address: Optional[str]


class InventoryDashboardStats(BaseModel):
    total_items: int
    available: int
    in_use: int
    under_service: int

class RenewalItem(BaseModel):
    """Represents a renewal job or license update request."""
    id: Optional[int]
    tenant_id: str
    item_name: str
    due_date: Optional[datetime] = None
    status: Optional[str] = "pending"

class RenewalItem(BaseModel):
    """Represents a renewal job or license update request."""
    id: Optional[int]
    tenant_id: str
    item_name: str
    due_date: Optional[datetime] = None
    status: Optional[str] = "pending"

# Added for automation_service
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class RenewalItem(BaseModel):
    id: Optional[int]
    tenant_id: str
    item_name: str
    due_date: Optional[datetime] = None
    status: Optional[str] = "pending"

# --- Added missing RenewalItem model for automation_service ---
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class RenewalItem(BaseModel):
    id: Optional[int]
    tenant_id: str
    item_name: str
    due_date: Optional[datetime] = None
    status: Optional[str] = "pending"
from pydantic import BaseModel
from typing import Optional, Dict, Any

class JobRepostRecord(BaseModel):
    job_id: str
    repost_time: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
class CreateRenewalItemRequest(BaseModel):
    tenant_id: str
    location_id: str
    renewal_type: str
    renewal_date: Optional[str] = None
    auto_approve: bool = False
    metadata: Optional[Dict[str, Any]] = None
class AutomationStatsResponse(BaseModel):
    total_jobs: int = 0
    completed_jobs: int = 0
    failed_jobs: int = 0
    pending_jobs: int = 0
    success_rate: Optional[float] = None
    last_run_time: Optional[str] = None
class CreateCustomerRequest(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
class Customer(BaseModel):
    id: Optional[str] = None
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    balance: Optional[float] = 0.0
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
class PricingPlan(BaseModel):
    id: Optional[str] = None
    name: str
    description: Optional[str] = None
    price: float
    currency: Optional[str] = "USD"
    billing_cycle: Optional[str] = "monthly"  # could be 'monthly', 'yearly', etc.
    features: Optional[List[str]] = None
    is_active: Optional[bool] = True
class CreateSubscriptionRequest(BaseModel):
    customer_id: str
    plan_id: str
    start_date: Optional[datetime] = datetime.now(timezone.utc)
    end_date: Optional[datetime] = None
    auto_renew: Optional[bool] = True
    payment_method_id: Optional[str] = None
# -----------------------------
# Billing / Subscription Models
# -----------------------------
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class Subscription(BaseModel):
    id: Optional[str] = None
    tenant_id: str
    plan_id: str
    start_date: datetime
    end_date: Optional[datetime] = None
    status: Optional[str] = "active"
    auto_renew: Optional[bool] = True
from enum import Enum

class BillingInterval(str, Enum):
    monthly = "monthly"
    yearly = "yearly"
    quarterly = "quarterly"
class BillingInterval(str, Enum):
    monthly = "monthly"
    yearly = "yearly"
    quarterly = "quarterly"

class UpdateSubscriptionRequest(BaseModel):
    plan_id: Optional[str] = None
    billing_interval: Optional[BillingInterval] = None
    auto_renew: Optional[bool] = None
    status: Optional[str] = None

class UsageRecord(BaseModel):
    id: Optional[str] = None
    tenant_id: str
    subscription_id: str
    metric: str  # e.g. "machines_active", "transactions_synced"
    amount: float
    period_start: datetime
    period_end: datetime
    created_at: datetime = datetime.now(timezone.utc)

class PaymentTransaction(BaseModel):
    id: Optional[str] = None
    tenant_id: str
    subscription_id: Optional[str] = None
    invoice_id: Optional[str] = None
    amount: float
    currency: str = "USD"
    status: str  # e.g. "pending", "completed", "failed"
    method: Optional[str] = None  # e.g. "stripe", "ach", "manual"
    external_ref: Optional[str] = None  # Stripe or bank transaction ID
    created_at: datetime = datetime.now(timezone.utc)






