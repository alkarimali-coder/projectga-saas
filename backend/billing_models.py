"""
Billing and Subscription Models for COAM SaaS
Comprehensive billing system with Stripe integration, multi-tenant support, and usage tracking
"""

from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


# Enums for billing system
class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    UNPAID = "unpaid"
    TRIALING = "trialing"
    INCOMPLETE = "incomplete"
    INCOMPLETE_EXPIRED = "incomplete_expired"


class PricingTier(str, Enum):
    STARTER = "starter"
    GROWTH = "growth"
    ENTERPRISE = "enterprise"


class BillingInterval(str, Enum):
    MONTHLY = "monthly"
    YEARLY = "yearly"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELED = "canceled"
    REFUNDED = "refunded"


class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    OPEN = "open"
    PAID = "paid"
    VOID = "void"
    UNCOLLECTIBLE = "uncollectible"


# Core Billing Models
class BillingAddress(BaseModel):
    """Customer billing address"""

    line1: str
    line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str = "US"


class Customer(BaseModel):
    """Billing customer information"""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    stripe_customer_id: Optional[str] = None
    email: EmailStr
    name: str
    phone: Optional[str] = None
    billing_address: Optional[BillingAddress] = None
    tax_id: Optional[str] = None  # For business tax ID
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PricingPlan(BaseModel):
    """Pricing plan configuration"""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    tier: PricingTier
    description: str

    # Per-machine pricing
    price_per_machine_monthly: float = 3.0
    price_per_machine_yearly: float = 30.0  # 10 months price for yearly

    # Per-user pricing
    price_per_user_monthly: float = 25.0
    price_per_user_yearly: float = 250.0  # 10 months price for yearly

    # Feature flags
    features: Dict[str, bool] = {
        "basic_reporting": True,
        "advanced_analytics": False,
        "ai_insights": False,
        "white_labeling": False,
        "api_access": False,
        "priority_support": False,
        "custom_integrations": False,
    }

    # Stripe price IDs for integration
    stripe_price_ids: Dict[str, str] = (
        {}
    )  # {"machine_monthly": "price_xxx", "user_yearly": "price_yyy"}

    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Subscription(BaseModel):
    """Customer subscription"""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    customer_id: str
    stripe_subscription_id: Optional[str] = None

    # Pricing configuration
    pricing_plan_id: str
    billing_interval: BillingInterval = BillingInterval.MONTHLY

    # Usage-based billing
    machine_count: int = 0
    user_count: int = 0

    # Subscription details
    status: SubscriptionStatus = SubscriptionStatus.ACTIVE
    current_period_start: datetime
    current_period_end: datetime
    trial_end: Optional[datetime] = None

    # Billing amounts
    base_amount: float = 0.0  # Fixed base cost
    machine_amount: float = 0.0  # Machine-based cost
    user_amount: float = 0.0  # User-based cost
    total_amount: float = 0.0  # Total monthly/yearly amount

    # Metadata
    metadata: Dict[str, Any] = {}

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    canceled_at: Optional[datetime] = None


class UsageRecord(BaseModel):
    """Usage tracking for billing"""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    subscription_id: str

    # Usage metrics
    period_start: datetime
    period_end: datetime
    machine_count: int = 0
    user_count: int = 0
    api_calls: int = 0
    reports_generated: int = 0
    notifications_sent: int = 0

    # Billing calculations
    machine_cost: float = 0.0
    user_cost: float = 0.0
    overage_cost: float = 0.0
    total_cost: float = 0.0

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PaymentMethod(BaseModel):
    """Customer payment method"""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    stripe_payment_method_id: str

    # Payment method details
    type: str  # "card", "bank_account", etc.
    card_brand: Optional[str] = None
    card_last4: Optional[str] = None
    card_exp_month: Optional[int] = None
    card_exp_year: Optional[int] = None

    is_default: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Invoice(BaseModel):
    """Invoice record"""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    customer_id: str
    subscription_id: Optional[str] = None
    stripe_invoice_id: Optional[str] = None

    # Invoice details
    invoice_number: str
    status: InvoiceStatus = InvoiceStatus.DRAFT

    # Amounts
    subtotal: float = 0.0
    tax: float = 0.0
    total: float = 0.0
    amount_paid: float = 0.0
    amount_due: float = 0.0

    # Line items
    line_items: List[Dict[str, Any]] = []

    # Dates
    issue_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    due_date: datetime
    paid_date: Optional[datetime] = None

    # URLs
    invoice_pdf_url: Optional[str] = None
    hosted_invoice_url: Optional[str] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PaymentTransaction(BaseModel):
    """Payment transaction record"""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    customer_id: str
    subscription_id: Optional[str] = None
    invoice_id: Optional[str] = None

    # Stripe integration
    stripe_session_id: Optional[str] = None
    stripe_payment_intent_id: Optional[str] = None
    stripe_charge_id: Optional[str] = None

    # Transaction details
    amount: float
    currency: str = "usd"
    status: PaymentStatus = PaymentStatus.PENDING
    payment_method_id: Optional[str] = None

    # Failure handling
    failure_code: Optional[str] = None
    failure_message: Optional[str] = None
    retry_count: int = 0

    # Metadata
    description: Optional[str] = None
    metadata: Dict[str, Any] = {}

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Request/Response Models for API
class CreateCustomerRequest(BaseModel):
    """Request to create a new customer"""

    email: EmailStr
    name: str
    phone: Optional[str] = None
    billing_address: Optional[BillingAddress] = None
    tax_id: Optional[str] = None


class CreateSubscriptionRequest(BaseModel):
    """Request to create a new subscription"""

    customer_id: str
    pricing_plan_id: str
    billing_interval: BillingInterval = BillingInterval.MONTHLY
    machine_count: int = 0
    user_count: int = 0
    trial_days: Optional[int] = None


class UpdateSubscriptionRequest(BaseModel):
    """Request to update subscription"""

    machine_count: Optional[int] = None
    user_count: Optional[int] = None
    pricing_plan_id: Optional[str] = None
    billing_interval: Optional[BillingInterval] = None


class CreateCheckoutSessionRequest(BaseModel):
    """Request to create Stripe checkout session"""

    subscription_id: str
    success_url: str
    cancel_url: str
    metadata: Optional[Dict[str, str]] = {}


class BillingDashboardResponse(BaseModel):
    """Response for billing dashboard"""

    customer: Customer
    subscription: Optional[Subscription] = None
    current_usage: Optional[UsageRecord] = None
    recent_invoices: List[Invoice] = []
    payment_methods: List[PaymentMethod] = []

    # Summary metrics
    monthly_cost: float = 0.0
    next_billing_date: Optional[datetime] = None
    days_until_billing: Optional[int] = None


class BillingStatsResponse(BaseModel):
    """Billing statistics for admin dashboard"""

    total_customers: int = 0
    active_subscriptions: int = 0
    monthly_recurring_revenue: float = 0.0
    annual_recurring_revenue: float = 0.0

    # Revenue breakdown
    machine_revenue: float = 0.0
    user_revenue: float = 0.0

    # Growth metrics
    new_customers_this_month: int = 0
    churn_rate: float = 0.0

    # Payment metrics
    successful_payments: int = 0
    failed_payments: int = 0
    overdue_invoices: int = 0


class WebhookEventRequest(BaseModel):
    """Stripe webhook event data"""

    event_type: str
    event_id: str
    session_id: Optional[str] = None
    payment_status: Optional[str] = None
    metadata: Optional[Dict[str, str]] = {}
