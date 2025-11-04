from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.core.db import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    message = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


# === TEMPORARY STUB ===
# Placeholder for CreateNotificationRequest used in NotificationService
from typing import Optional
from pydantic import BaseModel

class CreateNotificationRequest(BaseModel):
    tenant_id: str
    title: str
    message: str
    recipient_role: Optional[str] = None   # e.g. 'SuperAdmin', 'Dispatch', 'Tech'
    recipient_id: Optional[str] = None     # direct user ID if specific
    notification_type: Optional[str] = "system"  # 'system', 'alert', 'reminder'
    priority: Optional[str] = "normal"     # 'low', 'normal', 'high', 'critical'
    link_url: Optional[str] = None
    is_read: bool = False
    created_by: Optional[str] = None
# === END TEMPORARY STUB ===

# === TEMPORARY STUB ===
# Enum used in NotificationService to categorize notifications
from enum import Enum

class NotificationType(str, Enum):
    SYSTEM = "system"
    ALERT = "alert"
    REMINDER = "reminder"
    DISPATCH = "dispatch"
    SECURITY = "security"
    MAINTENANCE = "maintenance"
    BILLING = "billing"
    CUSTOM = "custom"
# === END TEMPORARY STUB ===

# === TEMPORARY STUB ===
# Model for per-location notification configuration
from typing import Optional
from pydantic import BaseModel

class LocationNotificationSettings(BaseModel):
    location_id: str
    enable_finance_alerts: bool = True
    enable_maintenance_alerts: bool = True
    enable_revenue_alerts: bool = True
    enable_security_alerts: bool = False
    enable_custom_notifications: bool = True
    preferred_channel: Optional[str] = "email"  # email, sms, inapp, etc.
    escalation_contact: Optional[str] = None
# === END TEMPORARY STUB ===

# === TEMPORARY STUB ===
# NotificationChannel: defines communication mediums for alerts
from enum import Enum

class NotificationChannel(str, Enum):
    INAPP = "inapp"
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    WEBHOOK = "webhook"
    SLACK = "slack"
# === END TEMPORARY STUB ===

# === TEMPORARY STUB ===
# Record of outbound webhook delivery attempts
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, Dict

class WebhookDeliveryRecord(BaseModel):
    id: Optional[str] = None
    tenant_id: str
    target_url: str
    payload: Optional[Dict] = None
    status_code: Optional[int] = None
    response_message: Optional[str] = None
    attempt_count: int = 1
    success: bool = False
    created_at: datetime = datetime.utcnow()
    last_attempt_at: Optional[datetime] = None
# === END TEMPORARY STUB ===

# === TEMPORARY STUB ===
# Aggregated stats for notification dashboard and reports
from pydantic import BaseModel
from typing import Optional

class NotificationStatsResponse(BaseModel):
    total_sent: int = 0
    total_failed: int = 0
    total_pending: int = 0
    total_read: int = 0
    total_webhooks_sent: int = 0
    total_webhooks_failed: int = 0
    tenant_id: Optional[str] = None
# === END TEMPORARY STUB ===

# === TEMPORARY STUB ===
# Request model for updating tenant or user notification preferences
from pydantic import BaseModel
from typing import Optional, Dict, Any

class UpdateNotificationSettingsRequest(BaseModel):
    tenant_id: str
    enabled_channels: Optional[Dict[str, bool]] = None  # {"email": True, "sms": False, ...}
    frequency: Optional[str] = "immediate"  # could be 'immediate', 'hourly', 'daily', etc.
    do_not_disturb: Optional[Dict[str, Any]] = None  # e.g. {"start": "22:00", "end": "07:00"}
    alert_thresholds: Optional[Dict[str, float]] = None  # {"revenue_drop": 0.1, "machine_offline": 5}
# === END TEMPORARY STUB ===
