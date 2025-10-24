"""
Security and Authentication Models for COAM SaaS Platform
Comprehensive security foundation with MFA, encryption, and audit logging
"""

from pydantic import BaseModel, Field, EmailStr, validator
from enum import Enum
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
import uuid
import re


class UserRole(str, Enum):
    """Enhanced role system aligned with enterprise requirements"""

    SUPER_ADMIN = "super_admin"  # Platform-wide admin
    TENANT_ADMIN = "tenant_admin"  # Tenant-level admin (replaces ML_ADMIN)
    DISPATCHER = "dispatcher"  # Job dispatch and coordination
    TECHNICIAN = "technician"  # Field technicians (replaces TECH)
    TECH = "tech"  # Legacy tech role (alias for TECHNICIAN)
    ACCOUNTANT = "accountant"  # Financial operations
    VIEWER = "viewer"  # Read-only access

    @classmethod
    def normalize_role(cls, role_value: str) -> "UserRole":
        """Normalize role values for backward compatibility"""
        # Handle legacy 'tech' role by mapping to TECHNICIAN
        role_mapping = {
            "tech": cls.TECHNICIAN,
            "technician": cls.TECHNICIAN,
            "super_admin": cls.SUPER_ADMIN,
            "tenant_admin": cls.TENANT_ADMIN,
            "dispatcher": cls.DISPATCHER,
            "accountant": cls.ACCOUNTANT,
            "viewer": cls.VIEWER,
        }

        normalized = role_mapping.get(role_value.lower())
        if normalized:
            return normalized

        # Try direct enum lookup
        try:
            return cls(role_value)
        except ValueError:
            raise ValueError(f"Invalid role: {role_value}")


class MFAMethod(str, Enum):
    """Multi-factor authentication methods"""

    TOTP = "totp"  # Time-based OTP (Google Authenticator)
    SMS = "sms"  # SMS-based OTP
    EMAIL = "email"  # Email-based OTP
    BACKUP_CODES = "backup_codes"  # One-time backup codes


class LoginAttemptStatus(str, Enum):
    """Login attempt tracking"""

    SUCCESS = "success"
    FAILED_PASSWORD = "failed_password"
    FAILED_MFA = "failed_mfa"
    BLOCKED = "blocked"
    SUSPICIOUS = "suspicious"


class AuditAction(str, Enum):
    """Enhanced audit actions for comprehensive tracking"""

    # Authentication events
    LOGIN = "login"
    LOGOUT = "logout"
    FAILED_LOGIN = "failed_login"
    PASSWORD_RESET = "password_reset"
    PASSWORD_CHANGE = "password_change"
    MFA_ENABLE = "mfa_enable"
    MFA_DISABLE = "mfa_disable"

    # User management
    USER_CREATE = "user_create"
    USER_UPDATE = "user_update"
    USER_DELETE = "user_delete"
    USER_ACTIVATE = "user_activate"
    USER_DEACTIVATE = "user_deactivate"
    ROLE_CHANGE = "role_change"

    # Billing and subscription
    SUBSCRIPTION_CREATE = "subscription_create"
    SUBSCRIPTION_UPDATE = "subscription_update"
    SUBSCRIPTION_CANCEL = "subscription_cancel"
    PAYMENT_PROCESS = "payment_process"
    INVOICE_GENERATE = "invoice_generate"

    # Data operations
    DATA_ACCESS = "data_access"
    DATA_EXPORT = "data_export"
    DATA_DELETE = "data_delete"
    DATA_ENCRYPTION = "data_encryption"

    # System events
    SYSTEM_CONFIG = "system_config"
    BACKUP_CREATE = "backup_create"
    SECURITY_EVENT = "security_event"

    # Tenant management
    TENANT_CREATE = "tenant_create"
    TENANT_UPDATE = "tenant_update"
    TENANT_DELETE = "tenant_delete"

    # Admin actions
    ADMIN_ACTION = "admin_action"


class DataClassification(str, Enum):
    """Data sensitivity classification for encryption"""

    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"
    RESTRICTED = "restricted"


class ComplianceFramework(str, Enum):
    """Supported compliance frameworks"""

    SOC2 = "soc2"
    GDPR = "gdpr"
    HIPAA = "hipaa"
    CCPA = "ccpa"


# Enhanced User Models
class PasswordPolicy(BaseModel):
    """Password policy configuration"""

    min_length: int = 8
    max_length: int = 128
    require_uppercase: bool = True
    require_lowercase: bool = True
    require_numbers: bool = True
    require_special_chars: bool = True
    prevent_common_passwords: bool = True
    prevent_personal_info: bool = True
    max_age_days: Optional[int] = 90
    history_count: int = 5


class MFAConfiguration(BaseModel):
    """Multi-factor authentication configuration"""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    method: MFAMethod
    secret_key: Optional[str] = None  # For TOTP
    phone_number: Optional[str] = None  # For SMS
    email: Optional[str] = None  # For email MFA
    backup_codes: List[str] = Field(default_factory=list)
    is_primary: bool = False
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_used: Optional[datetime] = None
    use_count: int = 0


class SecuritySession(BaseModel):
    """Enhanced session management"""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    tenant_id: Optional[str] = None
    token_hash: str
    refresh_token_hash: Optional[str] = None
    ip_address: str
    user_agent: str
    device_fingerprint: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_activity: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime
    mfa_verified: bool = False
    risk_score: float = 0.0  # 0-100 security risk assessment


class LoginAttempt(BaseModel):
    """Login attempt tracking for security monitoring"""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    email: str
    ip_address: str
    user_agent: str
    status: LoginAttemptStatus
    mfa_method: Optional[MFAMethod] = None
    failure_reason: Optional[str] = None
    risk_indicators: List[str] = Field(default_factory=list)
    location: Optional[Dict[str, Any]] = None  # Geolocation data
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class EncryptedField(BaseModel):
    """Encrypted field wrapper for PII data"""

    encrypted_value: str
    encryption_key_id: str
    algorithm: str = "AES-256-GCM"
    classification: DataClassification = DataClassification.CONFIDENTIAL
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @validator("encrypted_value")
    def validate_encrypted_value(cls, v):
        if not v or len(v) < 16:
            raise ValueError("Encrypted value must be at least 16 characters")
        return v


class AuditLog(BaseModel):
    """Enhanced audit logging with compliance features"""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    action: AuditAction
    resource_type: str
    resource_id: Optional[str] = None
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None

    # Security context
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    risk_score: float = 0.0

    # Compliance metadata
    data_classification: DataClassification = DataClassification.INTERNAL
    retention_date: Optional[datetime] = None
    compliance_frameworks: List[ComplianceFramework] = Field(default_factory=list)

    # Tamper protection
    checksum: Optional[str] = None
    previous_log_hash: Optional[str] = None

    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DataRetentionPolicy(BaseModel):
    """Data retention policy for compliance"""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: Optional[str] = None  # None for global policies
    resource_type: str
    classification: DataClassification
    retention_days: int
    auto_delete: bool = True
    compliance_frameworks: List[ComplianceFramework] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True


class PrivacyConsent(BaseModel):
    """GDPR/CCPA privacy consent tracking"""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    tenant_id: Optional[str] = None
    consent_type: str  # "data_processing", "marketing", "analytics", etc.
    granted: bool
    purpose: str
    legal_basis: Optional[str] = None  # GDPR legal basis
    consent_text: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None
    withdrawn_at: Optional[datetime] = None


class SecurityIncident(BaseModel):
    """Security incident tracking"""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: Optional[str] = None
    incident_type: str
    severity: str  # "low", "medium", "high", "critical"
    description: str
    affected_users: List[str] = Field(default_factory=list)
    affected_resources: List[str] = Field(default_factory=list)
    detection_method: str
    status: str = "open"  # "open", "investigating", "resolved", "closed"
    assigned_to: Optional[str] = None
    resolution: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None


# Request/Response Models for API endpoints
class MFASetupRequest(BaseModel):
    method: MFAMethod
    phone_number: Optional[str] = None
    email: Optional[str] = None

    @validator("phone_number")
    def validate_phone(cls, v, values):
        if values.get("method") == MFAMethod.SMS and not v:
            raise ValueError("Phone number required for SMS MFA")
        if v and not re.match(r"^\+[1-9]\d{1,14}$", v):
            raise ValueError("Invalid phone number format (use E.164)")
        return v


class MFAVerificationRequest(BaseModel):
    method: MFAMethod
    code: str
    backup_code: Optional[str] = None

    @validator("code")
    def validate_code(cls, v):
        if not v or not v.isdigit() or len(v) not in [6, 8]:
            raise ValueError("Code must be 6 or 8 digits")
        return v


class PasswordResetRequest(BaseModel):
    email: EmailStr
    new_password: str
    reset_token: str

    @validator("new_password")
    def validate_password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError("Password must contain at least one special character")
        return v


class SecurityReportRequest(BaseModel):
    """Security report generation request"""

    report_type: str  # "audit_log", "login_attempts", "security_incidents"
    start_date: datetime
    end_date: datetime
    tenant_id: Optional[str] = None
    user_id: Optional[str] = None
    format: str = "csv"  # "csv", "pdf", "json"
    include_pii: bool = False


class ComplianceStatus(BaseModel):
    """Compliance framework status"""

    framework: ComplianceFramework
    status: str  # "compliant", "non_compliant", "partial"
    last_assessment: datetime
    next_assessment: datetime
    findings: List[str] = Field(default_factory=list)
    remediation_items: List[str] = Field(default_factory=list)


# Enhanced User Model
class EnhancedUser(BaseModel):
    """Enhanced user model with comprehensive security features"""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: Optional[str] = None
    email: str  # Will be EmailStr in validation
    first_name: str
    last_name: str
    role: UserRole
    phone: Optional[str] = None
    is_active: bool = True

    # Security fields
    password_hash: str
    mfa_enabled: bool = False
    mfa_methods: List[MFAMethod] = Field(default_factory=list)
    account_locked: bool = False
    locked_until: Optional[datetime] = None
    password_changed_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    must_change_password: bool = False

    # Privacy and consent
    privacy_consent: Dict[str, bool] = Field(default_factory=dict)
    data_processing_consent: bool = False
    marketing_consent: bool = False

    # Audit fields
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None
    last_login: Optional[datetime] = None
    last_activity: Optional[datetime] = None
    login_count: int = 0

    @validator("role", pre=True)
    def normalize_user_role(cls, v):
        """Normalize role values for backward compatibility"""
        if isinstance(v, str):
            return UserRole.normalize_role(v)
        return v

    def has_tech_access(self) -> bool:
        """Check if user has technician/tech role access"""
        return self.role in [UserRole.TECHNICIAN, UserRole.TECH]

    def is_admin(self) -> bool:
        """Check if user has admin privileges"""
        return self.role in [UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN]

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}
