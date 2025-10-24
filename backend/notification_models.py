from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Union
from enum import Enum
import uuid


class NotificationType(str, Enum):
    RENEWAL_REMINDER = "renewal_reminder"
    OVERDUE_SERVICE = "overdue_service"
    LOW_INVENTORY = "low_inventory"
    REVENUE_DROP = "revenue_drop"
    COST_DISCREPANCY = "cost_discrepancy"
    URGENT_ISSUE = "urgent_issue"
    JOB_AUTO_REPOST = "job_auto_repost"
    JOB_FAILED = "job_failed"
    PARTS_REQUIRED = "parts_required"
    SYSTEM_ALERT = "system_alert"
    GENERAL = "general"


class NotificationPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"
    CRITICAL = "critical"


class NotificationChannel(str, Enum):
    WEB_PUSH = "web_push"
    EMAIL = "email"
    SMS = "sms"
    MOBILE_PUSH = "mobile_push"
    IN_APP = "in_app"


class NotificationStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"
    DISMISSED = "dismissed"


class RenewalType(str, Enum):
    LICENSE = "license"
    PERMIT = "permit"
    CONTRACT = "contract"
    INSURANCE = "insurance"
    CERTIFICATION = "certification"


class AutoPostingAction(str, Enum):
    AUTO_RESCHEDULE = "auto_reschedule"
    MANUAL_APPROVAL = "manual_approval"
    SUGGEST_PARTS = "suggest_parts"
    ESCALATE = "escalate"


# Base Notification Model
class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    type: NotificationType
    priority: NotificationPriority
    title: str
    message: str

    # Recipients
    user_ids: List[str] = Field(default_factory=list)
    role_targets: List[str] = Field(default_factory=list)  # Target specific roles
    location_ids: List[str] = Field(default_factory=list)  # Target specific locations

    # Channels and delivery
    channels: List[NotificationChannel] = Field(default_factory=list)
    status: NotificationStatus = NotificationStatus.PENDING

    # Metadata
    data: Dict[str, Any] = Field(default_factory=dict)
    action_url: Optional[str] = None
    expires_at: Optional[datetime] = None

    # Tracking
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    sent_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    dismissed_at: Optional[datetime] = None

    # Related entities
    related_entity_type: Optional[str] = None  # job, machine, location, contract, etc.
    related_entity_id: Optional[str] = None

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat() if v else None}


# Notification Settings per Location
class LocationNotificationSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    location_id: str
    location_name: str

    # Renewal reminder settings
    renewal_reminder_days: Dict[RenewalType, int] = Field(
        default_factory=lambda: {
            RenewalType.LICENSE: 30,
            RenewalType.PERMIT: 30,
            RenewalType.CONTRACT: 60,
            RenewalType.INSURANCE: 45,
            RenewalType.CERTIFICATION: 30,
        }
    )

    # Service alert settings
    overdue_service_hours: int = 24  # Alert after X hours overdue
    enable_auto_escalation: bool = True

    # Inventory alert settings
    low_inventory_threshold: int = 5  # Alert when stock below X items
    critical_inventory_threshold: int = 2  # Critical alert when stock below X

    # Financial alert settings
    revenue_drop_percentage: float = 15.0  # Alert on X% revenue drop
    cost_variance_percentage: float = 20.0  # Alert on X% cost increase

    # Auto-posting settings
    auto_posting_enabled: bool = True
    auto_posting_action: AutoPostingAction = AutoPostingAction.AUTO_RESCHEDULE
    auto_posting_max_attempts: int = 3
    require_parts_confirmation: bool = True

    # Channel preferences by notification type
    channel_preferences: Dict[NotificationType, List[NotificationChannel]] = Field(
        default_factory=lambda: {
            NotificationType.URGENT_ISSUE: [
                NotificationChannel.SMS,
                NotificationChannel.WEB_PUSH,
                NotificationChannel.MOBILE_PUSH,
            ],
            NotificationType.OVERDUE_SERVICE: [
                NotificationChannel.WEB_PUSH,
                NotificationChannel.EMAIL,
            ],
            NotificationType.LOW_INVENTORY: [
                NotificationChannel.EMAIL,
                NotificationChannel.WEB_PUSH,
            ],
            NotificationType.REVENUE_DROP: [NotificationChannel.EMAIL],
            NotificationType.RENEWAL_REMINDER: [
                NotificationChannel.EMAIL,
                NotificationChannel.WEB_PUSH,
            ],
        }
    )

    # Role-specific notification routing
    role_notification_routing: Dict[str, List[NotificationType]] = Field(
        default_factory=lambda: {
            "TECH": [
                NotificationType.URGENT_ISSUE,
                NotificationType.OVERDUE_SERVICE,
                NotificationType.JOB_AUTO_REPOST,
            ],
            "DISPATCH": [
                NotificationType.OVERDUE_SERVICE,
                NotificationType.JOB_FAILED,
                NotificationType.PARTS_REQUIRED,
            ],
            "ML_ADMIN": [
                NotificationType.REVENUE_DROP,
                NotificationType.COST_DISCREPANCY,
                NotificationType.RENEWAL_REMINDER,
            ],
            "WAREHOUSE": [
                NotificationType.LOW_INVENTORY,
                NotificationType.PARTS_REQUIRED,
            ],
        }
    )

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat() if v else None}


# Renewal Tracking Model
class RenewalItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    location_id: str

    # Renewal details
    type: RenewalType
    name: str
    description: Optional[str] = None

    # Dates
    issue_date: datetime
    expiry_date: datetime
    renewal_date: Optional[datetime] = None

    # Status and tracking
    is_active: bool = True
    is_renewed: bool = False
    auto_reminder_sent: bool = False

    # Related information
    vendor_name: Optional[str] = None
    cost: Optional[float] = None
    document_url: Optional[str] = None
    notes: Optional[str] = None

    # Tracking
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat() if v else None}


# Auto Job Reposting Model
class JobRepostRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str

    # Original job details
    original_job_id: str
    location_id: str
    machine_id: Optional[str] = None

    # Failure reason
    failure_reason: str
    failure_date: datetime

    # Reposting details
    action_taken: AutoPostingAction
    new_job_id: Optional[str] = None
    suggested_parts: List[Dict[str, Any]] = Field(default_factory=list)

    # Status
    repost_status: str  # success, failed, pending_approval
    attempt_count: int = 1
    max_attempts: int = 3

    # Approval workflow
    requires_approval: bool = False
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat() if v else None}


# Mobile App Integration Models
class MobileNotificationPayload(BaseModel):
    notification_id: str
    title: str
    body: str
    data: Dict[str, Any] = Field(default_factory=dict)
    action_url: Optional[str] = None
    priority: NotificationPriority


class WebhookDeliveryRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    notification_id: str
    webhook_url: str
    payload: Dict[str, Any]

    # Delivery tracking
    attempts: int = 0
    max_attempts: int = 3
    status: str  # pending, success, failed
    response_code: Optional[int] = None
    response_body: Optional[str] = None
    last_attempt_at: Optional[datetime] = None
    next_retry_at: Optional[datetime] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat() if v else None}


# Request/Response Models for API
class CreateNotificationRequest(BaseModel):
    type: NotificationType
    priority: NotificationPriority
    title: str
    message: str
    user_ids: Optional[List[str]] = None
    role_targets: Optional[List[str]] = None
    location_ids: Optional[List[str]] = None
    channels: Optional[List[NotificationChannel]] = None
    data: Optional[Dict[str, Any]] = None
    action_url: Optional[str] = None
    expires_at: Optional[datetime] = None
    related_entity_type: Optional[str] = None
    related_entity_id: Optional[str] = None


class UpdateNotificationSettingsRequest(BaseModel):
    renewal_reminder_days: Optional[Dict[RenewalType, int]] = None
    overdue_service_hours: Optional[int] = None
    enable_auto_escalation: Optional[bool] = None
    low_inventory_threshold: Optional[int] = None
    critical_inventory_threshold: Optional[int] = None
    revenue_drop_percentage: Optional[float] = None
    cost_variance_percentage: Optional[float] = None
    auto_posting_enabled: Optional[bool] = None
    auto_posting_action: Optional[AutoPostingAction] = None
    auto_posting_max_attempts: Optional[int] = None
    require_parts_confirmation: Optional[bool] = None
    channel_preferences: Optional[Dict[NotificationType, List[NotificationChannel]]] = (
        None
    )
    role_notification_routing: Optional[Dict[str, List[NotificationType]]] = None


class CreateRenewalItemRequest(BaseModel):
    type: RenewalType
    name: str
    description: Optional[str] = None
    issue_date: datetime
    expiry_date: datetime
    vendor_name: Optional[str] = None
    cost: Optional[float] = None
    document_url: Optional[str] = None
    notes: Optional[str] = None


class NotificationStatsResponse(BaseModel):
    total_notifications: int
    unread_count: int
    by_priority: Dict[NotificationPriority, int]
    by_type: Dict[NotificationType, int]
    by_status: Dict[NotificationStatus, int]


class AutomationStatsResponse(BaseModel):
    total_renewals: int
    expiring_soon: int
    overdue_services: int
    low_inventory_items: int
    auto_reposts_today: int
    pending_approvals: int
