"""
Tenant Management Models for COAM SaaS Platform
Comprehensive multi-tenant architecture with provisioning and management
"""

from pydantic import BaseModel, Field, EmailStr, validator
from enum import Enum
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
import uuid


class TenantStatus(str, Enum):
    """Tenant account status"""

    ACTIVE = "active"
    SUSPENDED = "suspended"
    TRIAL = "trial"
    EXPIRED = "expired"
    PENDING = "pending"
    DELETED = "deleted"


class TenantTier(str, Enum):
    """Tenant subscription tiers"""

    STARTER = "starter"
    GROWTH = "growth"
    ENTERPRISE = "enterprise"
    CUSTOM = "custom"


class BusinessType(str, Enum):
    """Type of business for tenant"""

    ARCADE = "arcade"
    BAR_RESTAURANT = "bar_restaurant"
    CONVENIENCE_STORE = "convenience_store"
    HOTEL_CASINO = "hotel_casino"
    RETAIL = "retail"
    ENTERTAINMENT = "entertainment"
    OTHER = "other"


class OnboardingStep(str, Enum):
    """Onboarding checklist steps"""

    ACCOUNT_CREATED = "account_created"
    ADMIN_USER_SETUP = "admin_user_setup"
    COMPANY_INFO_COMPLETE = "company_info_complete"
    LOCATIONS_ADDED = "locations_added"
    MACHINES_CONFIGURED = "machines_configured"
    BILLING_SETUP = "billing_setup"
    USERS_INVITED = "users_invited"
    FIRST_LOGIN = "first_login"
    TRAINING_COMPLETE = "training_complete"
    GO_LIVE = "go_live"


class TenantConfiguration(BaseModel):
    """Tenant-specific configuration settings"""

    branding: Dict[str, Any] = Field(default_factory=dict)
    features: Dict[str, bool] = Field(default_factory=dict)
    limits: Dict[str, int] = Field(default_factory=dict)
    integrations: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    notifications: Dict[str, Any] = Field(default_factory=dict)

    def get_default_config(self) -> Dict[str, Any]:
        """Get default configuration for new tenants"""
        return {
            "branding": {
                "logo_url": "",
                "primary_color": "#3B82F6",
                "company_name": "",
            },
            "features": {
                "advanced_analytics": False,
                "custom_reports": False,
                "api_access": False,
                "white_labeling": False,
                "priority_support": False,
            },
            "limits": {
                "max_users": 10,
                "max_machines": 50,
                "max_locations": 5,
                "storage_gb": 5,
                "api_calls_per_month": 10000,
            },
            "integrations": {
                "email": {"enabled": False, "provider": ""},
                "sms": {"enabled": False, "provider": ""},
                "accounting": {"enabled": False, "provider": ""},
            },
            "notifications": {
                "welcome_email": True,
                "billing_alerts": True,
                "maintenance_notices": True,
                "feature_updates": False,
            },
        }


class TenantMetrics(BaseModel):
    """Real-time tenant metrics"""

    total_users: int = 0
    active_users_30d: int = 0
    total_machines: int = 0
    active_machines: int = 0
    total_locations: int = 0
    monthly_revenue: float = 0.0
    total_revenue: float = 0.0
    storage_used_gb: float = 0.0
    api_calls_this_month: int = 0
    last_login: Optional[datetime] = None
    last_activity: Optional[datetime] = None
    support_tickets_open: int = 0

    # Churn indicators
    login_frequency_score: float = 100.0  # 0-100, lower is worse
    engagement_score: float = 100.0  # 0-100, lower is worse
    payment_health_score: float = 100.0  # 0-100, lower is worse
    overall_health_score: float = 100.0  # 0-100, lower is worse


class OnboardingProgress(BaseModel):
    """Tenant onboarding progress tracking"""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    steps_completed: List[OnboardingStep] = Field(default_factory=list)
    current_step: Optional[OnboardingStep] = OnboardingStep.ACCOUNT_CREATED
    completion_percentage: int = 0
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    is_complete: bool = False

    def calculate_completion_percentage(self) -> int:
        """Calculate completion percentage based on completed steps"""
        total_steps = len(OnboardingStep)
        completed_steps = len(self.steps_completed)
        return min(int((completed_steps / total_steps) * 100), 100)

    def mark_step_complete(self, step: OnboardingStep):
        """Mark an onboarding step as complete"""
        if step not in self.steps_completed:
            self.steps_completed.append(step)
            self.completion_percentage = self.calculate_completion_percentage()

            # Update current step to next uncompleted step
            all_steps = list(OnboardingStep)
            for next_step in all_steps:
                if next_step not in self.steps_completed:
                    self.current_step = next_step
                    break
            else:
                # All steps complete
                self.current_step = None
                self.is_complete = True
                self.completed_at = datetime.now(timezone.utc)


class Tenant(BaseModel):
    """Main tenant model with comprehensive information"""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

    # Basic Information
    company_name: str
    display_name: Optional[str] = None
    business_type: BusinessType = BusinessType.OTHER

    # Contact Information
    admin_email: EmailStr
    phone: Optional[str] = None
    website: Optional[str] = None

    # Address Information
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: str = "US"

    # Business Information
    license_number: Optional[str] = None
    tax_id: Optional[str] = None
    expected_machine_count: int = 1

    # Status and Dates
    status: TenantStatus = TenantStatus.PENDING
    tier: TenantTier = TenantTier.STARTER
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    activated_at: Optional[datetime] = None
    suspended_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

    # Subscription and Billing
    subscription_id: Optional[str] = None
    billing_email: Optional[EmailStr] = None

    # Configuration and Settings
    configuration: TenantConfiguration = Field(default_factory=TenantConfiguration)

    # Metrics and Health
    metrics: TenantMetrics = Field(default_factory=TenantMetrics)

    # Onboarding
    onboarding_progress: Optional[OnboardingProgress] = None

    # Metadata
    created_by: Optional[str] = None  # Super admin user ID
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)

    @validator("display_name", always=True)
    def set_display_name(cls, v, values):
        """Set display name to company name if not provided"""
        if not v and "company_name" in values:
            return values["company_name"]
        return v

    @validator("billing_email", always=True)
    def set_billing_email(cls, v, values):
        """Set billing email to admin email if not provided"""
        if not v and "admin_email" in values:
            return values["admin_email"]
        return v

    def activate(self):
        """Activate the tenant"""
        self.status = TenantStatus.ACTIVE
        self.activated_at = datetime.now(timezone.utc)

    def suspend(self, reason: Optional[str] = None):
        """Suspend the tenant"""
        self.status = TenantStatus.SUSPENDED
        self.suspended_at = datetime.now(timezone.utc)
        if reason and self.notes:
            self.notes += f"\nSuspended: {reason}"
        elif reason:
            self.notes = f"Suspended: {reason}"

    def delete(self):
        """Soft delete the tenant"""
        self.status = TenantStatus.DELETED
        self.deleted_at = datetime.now(timezone.utc)

    def calculate_health_score(self) -> float:
        """Calculate overall tenant health score"""
        scores = [
            self.metrics.login_frequency_score,
            self.metrics.engagement_score,
            self.metrics.payment_health_score,
        ]
        return sum(scores) / len(scores) if scores else 0.0


# Request/Response Models
class TenantCreateRequest(BaseModel):
    """Request model for creating a new tenant"""

    company_name: str
    admin_email: EmailStr
    admin_first_name: str
    admin_last_name: str
    admin_phone: Optional[str] = None

    # Business information
    business_type: BusinessType = BusinessType.OTHER
    expected_machine_count: int = 1
    initial_subscription_plan: TenantTier = TenantTier.STARTER

    # Address (optional)
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None

    # Additional information
    website: Optional[str] = None
    license_number: Optional[str] = None
    notes: Optional[str] = None

    # Configuration
    send_welcome_email: bool = True
    auto_activate: bool = True

    @validator("company_name")
    def validate_company_name(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError("Company name must be at least 2 characters")
        return v.strip()


class TenantUpdateRequest(BaseModel):
    """Request model for updating tenant information"""

    company_name: Optional[str] = None
    display_name: Optional[str] = None
    business_type: Optional[BusinessType] = None
    admin_email: Optional[EmailStr] = None
    phone: Optional[str] = None
    website: Optional[str] = None

    # Address
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None

    # Business
    license_number: Optional[str] = None
    expected_machine_count: Optional[int] = None

    # Configuration
    configuration: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None


class TenantStatusChangeRequest(BaseModel):
    """Request model for changing tenant status"""

    status: TenantStatus
    reason: Optional[str] = None
    notify_tenant: bool = True


class TenantListResponse(BaseModel):
    """Response model for tenant list with pagination"""

    tenants: List[Tenant]
    total: int
    page: int
    per_page: int
    has_next: bool
    has_prev: bool


class TenantProvisioningResult(BaseModel):
    """Result of tenant provisioning process"""

    tenant_id: str
    admin_user_id: str
    subscription_id: Optional[str] = None
    welcome_email_sent: bool = False
    initial_setup_complete: bool = False
    onboarding_url: str
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


class SystemHealthMetrics(BaseModel):
    """System-wide health metrics for super admin dashboard"""

    # System Performance
    uptime_percentage: float
    avg_response_time_ms: float
    error_rate_percentage: float

    # Database Metrics
    db_connection_count: int
    db_avg_query_time_ms: float

    # Tenant Metrics
    total_tenants: int
    active_tenants: int
    trial_tenants: int
    suspended_tenants: int

    # Revenue Metrics
    total_mrr: float  # Monthly Recurring Revenue
    new_mrr_this_month: float
    churned_mrr_this_month: float

    # Usage Metrics
    total_api_calls_today: int
    total_storage_used_gb: float

    # Health Indicators
    tenants_at_risk: int  # Low health score
    overdue_payments: int
    support_tickets_open: int

    # Timestamp
    collected_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============================================================================
# ML TENANT PROVISIONING MODELS
# ============================================================================


class MLTenantProvisioningRequest(BaseModel):
    """Request model for provisioning ML-enabled tenants"""

    # Company Information
    company_name: str = Field(..., min_length=1, max_length=200)
    website: Optional[str] = None
    business_type: str = Field(default="other")

    # Admin User Information
    admin_email: EmailStr
    admin_first_name: str = Field(..., min_length=1, max_length=50)
    admin_last_name: str = Field(..., min_length=1, max_length=50)
    admin_phone: Optional[str] = None

    # Address Information
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None

    # ML-Specific Configuration
    ml_features: List[str] = Field(
        default_factory=list
    )  # e.g., ["predictive_modeling", "advanced_analytics", "custom_algorithms"]
    expected_machine_count: int = Field(default=10, ge=1, le=10000)
    data_retention_days: int = Field(default=365, ge=30, le=2555)  # 30 days to 7 years

    # Subscription Configuration
    subscription_plan: TenantTier = Field(default=TenantTier.ENTERPRISE)

    # Setup Options
    send_welcome_email: bool = Field(default=True)
    setup_sample_data: bool = Field(default=False)
    enable_api_access: bool = Field(default=True)

    @validator("ml_features")
    def validate_ml_features(cls, v):
        """Validate ML features"""
        valid_features = [
            "predictive_modeling",
            "advanced_analytics",
            "custom_algorithms",
            "real_time_processing",
            "data_visualization",
            "automated_insights",
            "anomaly_detection",
            "forecasting",
            "classification",
            "clustering",
        ]

        for feature in v:
            if feature not in valid_features:
                raise ValueError(
                    f"Invalid ML feature: {feature}. Must be one of {valid_features}"
                )

        return v

    @validator("subscription_plan")
    def validate_ml_subscription(cls, v):
        """Ensure ML tenants have appropriate subscription tier"""
        # Allow string values and convert to enum
        if isinstance(v, str):
            if v.upper() in ["GROWTH", "ENTERPRISE"]:
                return getattr(TenantTier, v.upper())
            elif v.lower() in ["growth", "enterprise"]:
                return getattr(TenantTier, v.upper())

        if v not in [TenantTier.GROWTH, TenantTier.ENTERPRISE]:
            raise ValueError("ML tenants require Growth or Enterprise subscription")
        return v


# ============================================================================
# ENHANCED TENANT EXPORT AND SECURITY MONITORING MODELS
# ============================================================================


class ExportFormat(str, Enum):
    """Available export formats"""

    JSON = "json"
    CSV = "csv"
    EXCEL = "excel"


class ExportType(str, Enum):
    """Types of tenant exports"""

    FULL_DATA = "full_data"
    ANALYTICS_ONLY = "analytics_only"
    SECURITY_AUDIT = "security_audit"
    COMPLIANCE_REPORT = "compliance_report"
    ML_DATASET = "ml_dataset"


class TenantExportRequest(BaseModel):
    """Request model for tenant data export"""

    format: ExportFormat = Field(default=ExportFormat.JSON)
    export_type: ExportType = Field(default=ExportType.ANALYTICS_ONLY)

    # Data filtering
    tenant_ids: Optional[List[str]] = Field(
        default=None, description="Specific tenant IDs to export, null for all"
    )
    date_range: Optional[Dict[str, datetime]] = Field(
        default=None, description="Start and end dates for data"
    )

    # Privacy and security options
    include_pii: bool = Field(
        default=False, description="Include personally identifiable information"
    )
    anonymize_data: bool = Field(default=True, description="Anonymize sensitive data")

    # Export options
    include_metrics: bool = Field(default=True)
    include_usage_data: bool = Field(default=True)
    include_billing_data: bool = Field(default=False)
    include_support_tickets: bool = Field(default=False)

    @validator("date_range")
    def validate_date_range(cls, v):
        """Validate date range"""
        if v and ("start" not in v or "end" not in v):
            raise ValueError("Date range must include both 'start' and 'end' dates")
        if v and v["start"] >= v["end"]:
            raise ValueError("Start date must be before end date")
        return v


class AlertChannel(str, Enum):
    """Security alert channels"""

    EMAIL = "email"
    SMS = "sms"
    SLACK = "slack"
    WEBHOOK = "webhook"
    IN_APP = "in_app"


class SecurityMonitoringConfig(BaseModel):
    """Configuration for automated security monitoring"""

    # Monitoring settings
    enable_real_time_monitoring: bool = Field(default=True)
    enable_anomaly_detection: bool = Field(default=True)
    enable_threat_intelligence: bool = Field(default=True)

    # Alert thresholds
    failed_login_threshold: int = Field(default=5, ge=1, le=100)
    suspicious_activity_threshold: int = Field(default=10, ge=1, le=100)
    data_breach_alert: bool = Field(default=True)

    # Monitoring frequency (in minutes)
    scan_frequency: int = Field(default=5, ge=1, le=60)

    # Alert channels
    alert_channels: List[AlertChannel] = Field(default_factory=list)

    # Advanced settings
    auto_block_suspicious_ips: bool = Field(default=False)
    quarantine_compromised_accounts: bool = Field(default=False)

    # Notification settings
    notification_email: Optional[EmailStr] = None
    webhook_url: Optional[str] = None
    slack_webhook_url: Optional[str] = None

    @validator("alert_channels")
    def validate_alert_channels(cls, v):
        """Ensure at least one alert channel is specified"""
        if not v:
            raise ValueError("At least one alert channel must be specified")
        return v
