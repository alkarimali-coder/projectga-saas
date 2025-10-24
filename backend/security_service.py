"""
Security Service for COAM SaaS Platform
Comprehensive security operations including MFA, audit logging, and compliance
"""

import os
import re
import secrets
import hashlib
import hmac
import pyotp
import qrcode
import io
import base64
import json
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any, Tuple, Union
from motor.motor_asyncio import AsyncIOMotorDatabase
import bcrypt
import jwt
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from twilio.rest import Client
from twilio.base.exceptions import TwilioException

from security_models import (
    UserRole,
    MFAMethod,
    LoginAttemptStatus,
    AuditAction,
    DataClassification,
    ComplianceFramework,
    MFAConfiguration,
    SecuritySession,
    LoginAttempt,
    AuditLog,
    DataRetentionPolicy,
    PrivacyConsent,
    SecurityIncident,
    PasswordPolicy,
    MFASetupRequest,
    MFAVerificationRequest,
)
from encryption_service import encryption_service
import logging

logger = logging.getLogger(__name__)


class SecurityError(Exception):
    """Base security exception"""

    pass


class AuthenticationError(SecurityError):
    """Authentication related errors"""

    pass


class AuthorizationError(SecurityError):
    """Authorization related errors"""

    pass


class MFAError(SecurityError):
    """Multi-factor authentication errors"""

    pass


class SecurityService:
    """
    Comprehensive security service handling:
    - Enhanced authentication with MFA
    - Role-based access control
    - Audit logging with tamper protection
    - Security monitoring and incident tracking
    - Compliance features (GDPR, SOC2)
    """

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.password_policy = PasswordPolicy()

        # JWT Configuration
        self.jwt_secret = os.getenv("JWT_SECRET_KEY", "change-in-production")
        self.jwt_algorithm = "HS256"
        self.access_token_expire = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
        self.refresh_token_expire = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

        # External service clients
        self._init_external_services()

        # Security monitoring
        self.max_failed_attempts = int(os.getenv("MAX_FAILED_LOGIN_ATTEMPTS", "5"))
        self.lockout_duration = int(os.getenv("ACCOUNT_LOCKOUT_MINUTES", "15"))

        # Last log hash for tamper detection
        self._last_audit_hash = None

    def _init_external_services(self):
        """Initialize external service clients"""
        try:
            # SendGrid for email
            sendgrid_key = os.getenv("SENDGRID_API_KEY")
            if sendgrid_key:
                self.sendgrid = SendGridAPIClient(sendgrid_key)
                self.sender_email = os.getenv("SENDER_EMAIL", "noreply@coamsaas.com")
            else:
                self.sendgrid = None
                logger.warning("SendGrid not configured - email MFA unavailable")

            # Twilio for SMS
            twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
            twilio_token = os.getenv("TWILIO_AUTH_TOKEN")
            if twilio_sid and twilio_token:
                self.twilio = Client(twilio_sid, twilio_token)
                self.twilio_verify_sid = os.getenv("TWILIO_VERIFY_SERVICE")
            else:
                self.twilio = None
                logger.warning("Twilio not configured - SMS MFA unavailable")

        except Exception as e:
            logger.error(f"Failed to initialize external services: {str(e)}")

    # Enhanced Authentication Methods
    async def validate_password_strength(
        self, password: str, user_email: str = None
    ) -> Tuple[bool, List[str]]:
        """
        Validate password against security policy

        Args:
            password: Password to validate
            user_email: User email for personal info checking

        Returns:
            Tuple of (is_valid, error_messages)
        """
        errors = []

        if len(password) < self.password_policy.min_length:
            errors.append(
                f"Password must be at least {self.password_policy.min_length} characters"
            )

        if len(password) > self.password_policy.max_length:
            errors.append(
                f"Password must be no more than {self.password_policy.max_length} characters"
            )

        if self.password_policy.require_uppercase and not re.search(r"[A-Z]", password):
            errors.append("Password must contain at least one uppercase letter")

        if self.password_policy.require_lowercase and not re.search(r"[a-z]", password):
            errors.append("Password must contain at least one lowercase letter")

        if self.password_policy.require_numbers and not re.search(r"\d", password):
            errors.append("Password must contain at least one number")

        if self.password_policy.require_special_chars and not re.search(
            r'[!@#$%^&*(),.?":{}|<>]', password
        ):
            errors.append("Password must contain at least one special character")

        # Check against common passwords
        if self.password_policy.prevent_common_passwords:
            if await self._is_common_password(password):
                errors.append(
                    "Password is too common - please choose a more secure password"
                )

        # Check against personal information
        if self.password_policy.prevent_personal_info and user_email:
            username = user_email.split("@")[0].lower()
            if username in password.lower() or password.lower() in username:
                errors.append("Password cannot contain parts of your email address")

        return len(errors) == 0, errors

    async def _is_common_password(self, password: str) -> bool:
        """Check if password is in common password list"""
        # Simple implementation - in production, use a proper common password list
        common_passwords = {
            "password",
            "123456",
            "password123",
            "admin",
            "letmein",
            "welcome",
            "monkey",
            "1234567890",
            "qwerty",
            "abc123",
        }
        return password.lower() in common_passwords

    async def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        salt = bcrypt.gensalt(rounds=12)
        return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    async def verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))

    # Multi-Factor Authentication
    async def setup_totp_mfa(self, user_id: str, user_email: str) -> Dict[str, Any]:
        """
        Set up TOTP-based MFA for user

        Returns:
            Dictionary with secret, QR code, and backup codes
        """
        try:
            # Generate secret
            secret = pyotp.random_base32()

            # Generate QR code
            totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
                name=user_email, issuer_name="COAM SaaS"
            )

            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(totp_uri)
            qr.make(fit=True)

            img = qr.make_image(fill_color="black", back_color="white")
            buffer = io.BytesIO()
            img.save(buffer, format="PNG")
            qr_code_data = base64.b64encode(buffer.getvalue()).decode()

            # Generate backup codes
            backup_codes = [secrets.token_hex(4).upper() for _ in range(8)]

            # Store MFA configuration
            mfa_config = MFAConfiguration(
                user_id=user_id,
                method=MFAMethod.TOTP,
                secret_key=secret,
                backup_codes=[await self.hash_password(code) for code in backup_codes],
                is_primary=True,
            )

            await self.db.mfa_configurations.insert_one(mfa_config.dict())

            # Log MFA setup
            await self.log_security_event(
                user_id=user_id,
                action=AuditAction.MFA_ENABLE,
                resource_type="mfa_config",
                details={"method": "TOTP"},
            )

            return {
                "secret": secret,
                "qr_code": f"data:image/png;base64,{qr_code_data}",
                "backup_codes": backup_codes,
            }

        except Exception as e:
            logger.error(f"TOTP MFA setup failed: {str(e)}")
            raise MFAError(f"Failed to set up TOTP MFA: {str(e)}")

    async def setup_sms_mfa(self, user_id: str, phone_number: str) -> Dict[str, Any]:
        """Set up SMS-based MFA"""
        try:
            if not self.twilio:
                raise MFAError("SMS MFA not available - Twilio not configured")

            # Validate phone number format (E.164)
            if not re.match(r"^\+[1-9]\d{1,14}$", phone_number):
                raise MFAError("Invalid phone number format - use E.164 format")

            # Test SMS delivery
            verification_code = secrets.randbelow(1000000)
            formatted_code = f"{verification_code:06d}"

            try:
                message = self.twilio.messages.create(
                    body=f"Your COAM SaaS verification code is: {formatted_code}",
                    from_=os.getenv("TWILIO_PHONE_NUMBER"),
                    to=phone_number,
                )
            except TwilioException as e:
                raise MFAError(f"SMS delivery test failed: {str(e)}")

            # Store MFA configuration
            mfa_config = MFAConfiguration(
                user_id=user_id,
                method=MFAMethod.SMS,
                phone_number=phone_number,
                is_primary=True,
            )

            await self.db.mfa_configurations.insert_one(mfa_config.dict())

            await self.log_security_event(
                user_id=user_id,
                action=AuditAction.MFA_ENABLE,
                resource_type="mfa_config",
                details={
                    "method": "SMS",
                    "phone": phone_number[-4:],
                },  # Log only last 4 digits
            )

            return {
                "status": "success",
                "message": "SMS MFA configured successfully",
                "test_message_sid": message.sid,
            }

        except Exception as e:
            logger.error(f"SMS MFA setup failed: {str(e)}")
            raise MFAError(f"Failed to set up SMS MFA: {str(e)}")

    async def setup_email_mfa(self, user_id: str, email: str) -> Dict[str, Any]:
        """Set up email-based MFA"""
        try:
            if not self.sendgrid:
                raise MFAError("Email MFA not available - SendGrid not configured")

            # Test email delivery
            test_code = secrets.randbelow(1000000)
            formatted_code = f"{test_code:06d}"

            message = Mail(
                from_email=self.sender_email,
                to_emails=email,
                subject="COAM SaaS - Email MFA Setup",
                html_content=f"""
                <h2>Email MFA Setup</h2>
                <p>Your email MFA has been configured successfully.</p>
                <p>Test verification code: <strong>{formatted_code}</strong></p>
                <p>This code expires in 10 minutes.</p>
                """,
            )

            try:
                response = self.sendgrid.send(message)
                if response.status_code != 202:
                    raise MFAError("Email delivery test failed")
            except Exception as e:
                raise MFAError(f"Email delivery test failed: {str(e)}")

            # Store MFA configuration
            mfa_config = MFAConfiguration(
                user_id=user_id, method=MFAMethod.EMAIL, email=email, is_primary=True
            )

            await self.db.mfa_configurations.insert_one(mfa_config.dict())

            await self.log_security_event(
                user_id=user_id,
                action=AuditAction.MFA_ENABLE,
                resource_type="mfa_config",
                details={"method": "EMAIL"},
            )

            return {"status": "success", "message": "Email MFA configured successfully"}

        except Exception as e:
            logger.error(f"Email MFA setup failed: {str(e)}")
            raise MFAError(f"Failed to set up email MFA: {str(e)}")

    async def send_mfa_code(self, user_id: str, method: MFAMethod) -> Dict[str, Any]:
        """Send MFA verification code"""
        try:
            # Get user's MFA configuration
            mfa_config = await self.db.mfa_configurations.find_one(
                {"user_id": user_id, "method": method, "is_active": True}
            )

            if not mfa_config:
                raise MFAError(f"MFA method {method} not configured for user")

            # Generate verification code
            verification_code = secrets.randbelow(1000000)
            formatted_code = f"{verification_code:06d}"

            # Store code temporarily (5 minutes expiry)
            code_expiry = datetime.now(timezone.utc) + timedelta(minutes=5)
            code_hash = await self.hash_password(formatted_code)

            await self.db.mfa_codes.insert_one(
                {
                    "user_id": user_id,
                    "method": method,
                    "code_hash": code_hash,
                    "expires_at": code_expiry,
                    "used": False,
                    "created_at": datetime.now(timezone.utc),
                }
            )

            # Send code based on method
            if method == MFAMethod.SMS:
                await self._send_sms_code(mfa_config["phone_number"], formatted_code)
            elif method == MFAMethod.EMAIL:
                await self._send_email_code(mfa_config["email"], formatted_code)
            else:
                raise MFAError(f"Cannot send code for method: {method}")

            return {"status": "sent", "expires_in": 300}  # 5 minutes

        except Exception as e:
            logger.error(f"MFA code sending failed: {str(e)}")
            raise MFAError(f"Failed to send MFA code: {str(e)}")

    async def _send_sms_code(self, phone_number: str, code: str):
        """Send SMS verification code"""
        if not self.twilio:
            raise MFAError("SMS service not available")

        message = self.twilio.messages.create(
            body=f"Your COAM SaaS verification code is: {code}. Valid for 5 minutes.",
            from_=os.getenv("TWILIO_PHONE_NUMBER"),
            to=phone_number,
        )

    async def _send_email_code(self, email: str, code: str):
        """Send email verification code"""
        if not self.sendgrid:
            raise MFAError("Email service not available")

        message = Mail(
            from_email=self.sender_email,
            to_emails=email,
            subject="COAM SaaS - Verification Code",
            html_content=f"""
            <h2>Verification Code</h2>
            <p>Your verification code is: <strong>{code}</strong></p>
            <p>This code expires in 5 minutes.</p>
            <p>If you didn't request this code, please contact support immediately.</p>
            """,
        )

        response = self.sendgrid.send(message)

    async def verify_mfa_code(self, user_id: str, method: MFAMethod, code: str) -> bool:
        """Verify MFA code"""
        try:
            if method == MFAMethod.TOTP:
                return await self._verify_totp_code(user_id, code)
            else:
                return await self._verify_otp_code(user_id, method, code)

        except Exception as e:
            logger.error(f"MFA verification failed: {str(e)}")
            return False

    async def _verify_totp_code(self, user_id: str, code: str) -> bool:
        """Verify TOTP code"""
        mfa_config = await self.db.mfa_configurations.find_one(
            {"user_id": user_id, "method": MFAMethod.TOTP, "is_active": True}
        )

        if not mfa_config:
            return False

        totp = pyotp.TOTP(mfa_config["secret_key"])
        return totp.verify(code, valid_window=1)  # Allow 1 step tolerance

    async def _verify_otp_code(
        self, user_id: str, method: MFAMethod, code: str
    ) -> bool:
        """Verify OTP code (SMS/Email)"""
        # Find valid, unused code
        stored_code = await self.db.mfa_codes.find_one(
            {
                "user_id": user_id,
                "method": method,
                "used": False,
                "expires_at": {"$gt": datetime.now(timezone.utc)},
            }
        )

        if not stored_code:
            return False

        # Verify code
        is_valid = await self.verify_password(code, stored_code["code_hash"])

        if is_valid:
            # Mark code as used
            await self.db.mfa_codes.update_one(
                {"_id": stored_code["_id"]},
                {"$set": {"used": True, "used_at": datetime.now(timezone.utc)}},
            )

        return is_valid

    # Enhanced Audit Logging
    async def log_security_event(
        self,
        action: AuditAction,
        resource_type: str,
        user_id: Optional[str] = None,
        tenant_id: Optional[str] = None,
        session_id: Optional[str] = None,
        resource_id: Optional[str] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        risk_score: float = 0.0,
        details: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Log security event with tamper protection

        Returns:
            Audit log ID
        """
        try:
            # Create audit log entry
            audit_log = AuditLog(
                tenant_id=tenant_id,
                user_id=user_id,
                session_id=session_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                old_values=old_values,
                new_values=new_values,
                ip_address=ip_address,
                user_agent=user_agent,
                risk_score=risk_score,
                compliance_frameworks=[ComplianceFramework.SOC2],  # Default to SOC2
            )

            # Add tamper protection
            log_data = audit_log.dict()
            log_data["previous_log_hash"] = self._last_audit_hash

            # Calculate checksum
            checksum_data = json.dumps(
                {
                    k: v
                    for k, v in log_data.items()
                    if k not in ["id", "checksum", "timestamp"]
                },
                sort_keys=True,
                default=str,
            )

            checksum = hashlib.sha256(checksum_data.encode()).hexdigest()
            log_data["checksum"] = checksum

            # Insert audit log
            result = await self.db.audit_logs.insert_one(log_data)

            # Update last hash for tamper detection
            self._last_audit_hash = hashlib.sha256(
                f"{result.inserted_id}{checksum}".encode()
            ).hexdigest()

            # Add to details if provided
            if details:
                await self.db.audit_log_details.insert_one(
                    {
                        "audit_log_id": str(result.inserted_id),
                        "details": details,
                        "created_at": datetime.now(timezone.utc),
                    }
                )

            return str(result.inserted_id)

        except Exception as e:
            logger.error(f"Audit logging failed: {str(e)}")
            # Don't raise exception to avoid breaking main operations
            return ""

    # Role-Based Access Control
    def check_permission(
        self,
        user_role: UserRole,
        required_role: UserRole,
        tenant_id: Optional[str] = None,
        user_tenant_id: Optional[str] = None,
    ) -> bool:
        """
        Check if user has required permissions

        Args:
            user_role: User's current role
            required_role: Minimum required role
            tenant_id: Target resource tenant ID
            user_tenant_id: User's tenant ID

        Returns:
            True if user has permission, False otherwise
        """
        # Super admin has access to everything
        if user_role == UserRole.SUPER_ADMIN:
            return True

        # Check tenant access for regular users
        if tenant_id and user_tenant_id != tenant_id:
            return False

        # Role hierarchy
        role_hierarchy = {
            UserRole.SUPER_ADMIN: 100,
            UserRole.TENANT_ADMIN: 80,
            UserRole.DISPATCHER: 60,
            UserRole.TECHNICIAN: 40,
            UserRole.ACCOUNTANT: 40,  # Same level as technician, different scope
            UserRole.VIEWER: 20,
        }

        user_level = role_hierarchy.get(user_role, 0)
        required_level = role_hierarchy.get(required_role, 0)

        return user_level >= required_level

    # Token Management
    async def create_secure_tokens(
        self, user_id: str, tenant_id: Optional[str] = None
    ) -> Dict[str, str]:
        """Create JWT access and refresh tokens"""
        now = datetime.now(timezone.utc)

        # Access token payload
        access_payload = {
            "sub": user_id,
            "tenant_id": tenant_id,
            "type": "access",
            "iat": now,
            "exp": now + timedelta(minutes=self.access_token_expire),
        }

        # Refresh token payload
        refresh_payload = {
            "sub": user_id,
            "tenant_id": tenant_id,
            "type": "refresh",
            "iat": now,
            "exp": now + timedelta(days=self.refresh_token_expire),
        }

        access_token = jwt.encode(
            access_payload, self.jwt_secret, algorithm=self.jwt_algorithm
        )
        refresh_token = jwt.encode(
            refresh_payload, self.jwt_secret, algorithm=self.jwt_algorithm
        )

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": self.access_token_expire * 60,  # Convert to seconds
        }

    async def verify_token(self, token: str) -> Dict[str, Any]:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(
                token, self.jwt_secret, algorithms=[self.jwt_algorithm]
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise AuthenticationError("Token has expired")
        except jwt.InvalidTokenError:
            raise AuthenticationError("Invalid token")

    # Security Monitoring
    async def track_login_attempt(
        self,
        user_id: Optional[str],
        email: str,
        ip_address: str,
        user_agent: str,
        status: LoginAttemptStatus,
        mfa_method: Optional[MFAMethod] = None,
        failure_reason: Optional[str] = None,
    ) -> str:
        """Track login attempt for security monitoring"""

        login_attempt = LoginAttempt(
            user_id=user_id,
            email=email,
            ip_address=ip_address,
            user_agent=user_agent,
            status=status,
            mfa_method=mfa_method,
            failure_reason=failure_reason,
        )

        # Calculate risk score
        risk_score = await self._calculate_risk_score(email, ip_address, user_agent)

        result = await self.db.login_attempts.insert_one(login_attempt.dict())

        # Check for suspicious activity
        if risk_score > 70 or status == LoginAttemptStatus.SUSPICIOUS:
            await self._handle_suspicious_activity(
                user_id, email, ip_address, risk_score
            )

        return str(result.inserted_id)

    async def _calculate_risk_score(
        self, email: str, ip_address: str, user_agent: str
    ) -> float:
        """Calculate login risk score based on various factors"""
        risk_score = 0.0

        # Check recent failed attempts
        recent_failures = await self.db.login_attempts.count_documents(
            {
                "email": email,
                "status": {
                    "$in": [
                        LoginAttemptStatus.FAILED_PASSWORD,
                        LoginAttemptStatus.FAILED_MFA,
                    ]
                },
                "timestamp": {"$gt": datetime.now(timezone.utc) - timedelta(hours=1)},
            }
        )
        risk_score += min(recent_failures * 20, 60)

        # Check IP reputation (simplified)
        # In production, integrate with IP reputation services
        if ip_address.startswith("10.") or ip_address.startswith("192.168."):
            risk_score -= 10  # Lower risk for internal IPs

        # Check for new device/browser
        recent_login = await self.db.login_attempts.find_one(
            {
                "email": email,
                "status": LoginAttemptStatus.SUCCESS,
                "user_agent": user_agent,
            }
        )
        if not recent_login:
            risk_score += 30  # New device increases risk

        return min(risk_score, 100)

    async def _handle_suspicious_activity(
        self, user_id: Optional[str], email: str, ip_address: str, risk_score: float
    ):
        """Handle suspicious login activity"""

        # Create security incident
        incident = SecurityIncident(
            incident_type="suspicious_login",
            severity="medium" if risk_score < 80 else "high",
            description=f"Suspicious login activity detected for {email} from IP {ip_address}",
            affected_users=[user_id] if user_id else [],
            detection_method="automated_risk_scoring",
        )

        await self.db.security_incidents.insert_one(incident.dict())

        # Log security event
        await self.log_security_event(
            user_id=user_id,
            action=AuditAction.SECURITY_EVENT,
            resource_type="login_attempt",
            ip_address=ip_address,
            risk_score=risk_score,
            details={"incident_type": "suspicious_login", "risk_score": risk_score},
        )

    # Compliance Features
    async def record_privacy_consent(
        self,
        user_id: str,
        tenant_id: Optional[str],
        consent_type: str,
        granted: bool,
        purpose: str,
        legal_basis: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> str:
        """Record privacy consent for GDPR compliance"""

        consent = PrivacyConsent(
            user_id=user_id,
            tenant_id=tenant_id,
            consent_type=consent_type,
            granted=granted,
            purpose=purpose,
            legal_basis=legal_basis,
            consent_text=f"User {'granted' if granted else 'denied'} consent for {purpose}",
            ip_address=ip_address,
            user_agent=user_agent,
        )

        result = await self.db.privacy_consents.insert_one(consent.dict())

        await self.log_security_event(
            user_id=user_id,
            tenant_id=tenant_id,
            action=AuditAction.DATA_ACCESS,
            resource_type="privacy_consent",
            resource_id=str(result.inserted_id),
            details={"consent_type": consent_type, "granted": granted},
        )

        return str(result.inserted_id)

    async def get_security_metrics(
        self, tenant_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get security metrics for monitoring dashboard"""

        # Date range for metrics
        last_24h = datetime.now(timezone.utc) - timedelta(hours=24)
        last_7d = datetime.now(timezone.utc) - timedelta(days=7)

        query_filter = {}
        if tenant_id:
            query_filter["tenant_id"] = tenant_id

        # Login metrics
        total_logins = await self.db.login_attempts.count_documents(
            {**query_filter, "timestamp": {"$gt": last_24h}}
        )

        failed_logins = await self.db.login_attempts.count_documents(
            {
                **query_filter,
                "status": {
                    "$in": [
                        LoginAttemptStatus.FAILED_PASSWORD,
                        LoginAttemptStatus.FAILED_MFA,
                    ]
                },
                "timestamp": {"$gt": last_24h},
            }
        )

        # Security incidents
        open_incidents = await self.db.security_incidents.count_documents(
            {**query_filter, "status": {"$in": ["open", "investigating"]}}
        )

        # MFA adoption
        total_users = await self.db.users.count_documents(
            {"tenant_id": tenant_id} if tenant_id else {}
        )
        mfa_enabled_users = await self.db.mfa_configurations.distinct(
            "user_id", {"is_active": True}
        )

        return {
            "login_metrics": {
                "total_logins_24h": total_logins,
                "failed_logins_24h": failed_logins,
                "success_rate": (1 - (failed_logins / max(total_logins, 1))) * 100,
            },
            "security_incidents": {"open_incidents": open_incidents},
            "mfa_adoption": {
                "total_users": total_users,
                "mfa_enabled": len(mfa_enabled_users),
                "adoption_rate": (len(mfa_enabled_users) / max(total_users, 1)) * 100,
            },
        }
