"""
Tenant Management Service
Handles tenant CRUD operations with encryption
"""

import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from core_models import User, UserRole
from database import database
from encryption_service import encryption_service
from auth_service import auth_service

logger = logging.getLogger(__name__)


class TenantService:
    """Service for tenant management operations"""

    def __init__(self):
        self.encrypted_fields = [
            "admin_email",
            "company_name",
            "phone",
            "address_line1",
            "city",
        ]
        self._database = database

    async def _get_db(self):
        """Get database instance with connection verification"""
        if not self._database.client:
            await self._database.connect()
        return self._database.db

    async def _ensure_connection(self):
        """Ensure database connection is active"""
        try:
            if self._database.client:
                # Test the connection
                await self._database.client.admin.command("ping")
            else:
                await self._database.connect()
        except Exception as e:
            logger.error(f"Database connection failed, reconnecting: {str(e)}")
            await self._database.connect()

    def _clean_tenant_data(self, tenant: Dict[str, Any]) -> Dict[str, Any]:
        """Clean tenant data for JSON serialization"""
        from datetime import datetime

        cleaned = {}
        for key, value in tenant.items():
            # Skip MongoDB internal fields
            if key.startswith("_"):
                continue

            # Handle ObjectId (check by type name to avoid import issues)
            if hasattr(value, "__class__") and "ObjectId" in str(type(value)):
                cleaned[key] = str(value)
            # Handle datetime
            elif isinstance(value, datetime):
                cleaned[key] = value.isoformat()
            # Handle nested dicts (like encrypted fields)
            elif isinstance(value, dict):
                cleaned_dict = {}
                for sub_key, sub_value in value.items():
                    if hasattr(sub_value, "__class__") and "ObjectId" in str(
                        type(sub_value)
                    ):
                        cleaned_dict[sub_key] = str(sub_value)
                    elif isinstance(sub_value, datetime):
                        cleaned_dict[sub_key] = sub_value.isoformat()
                    else:
                        cleaned_dict[sub_key] = sub_value
                cleaned[key] = cleaned_dict
            else:
                cleaned[key] = value

        return cleaned

    async def create_tenant(self, tenant_data: Dict[str, Any], created_by: str) -> str:
        """Create a new tenant with encrypted PII"""
        try:
            await self._ensure_connection()
            db = await self._get_db()

            # Create tenant object
            tenant = Tenant(**tenant_data)
            tenant.created_by = created_by
            tenant.created_at = datetime.now(timezone.utc)

            # Convert to dict for encryption
            tenant_dict = tenant.dict()

            # Encrypt PII fields
            for field_name in self.encrypted_fields:
                if field_name in tenant_dict and tenant_dict[field_name]:
                    encrypted_field = encryption_service.encrypt_field(
                        tenant_dict[field_name]
                    )
                    tenant_dict[field_name] = encrypted_field.dict()

            # Store in database
            result = await db.tenants.insert_one(tenant_dict)

            # Create admin user for tenant
            await self._create_tenant_admin(tenant, result.inserted_id)

            logger.info(f"Created tenant: {tenant.company_name} (ID: {tenant.id})")
            return tenant.id

        except Exception as e:
            logger.error(f"Failed to create tenant: {str(e)}")
            raise

    async def _create_tenant_admin(self, tenant: Tenant, tenant_id: str):
        """Create admin user for new tenant"""
        try:
            db = await self._get_db()

            admin_user = User(
                tenant_id=tenant_id,
                email=tenant.admin_email,
                first_name=tenant.admin_first_name,
                last_name=tenant.admin_last_name,
                role=UserRole.TENANT_ADMIN,
                password_hash=auth_service.hash_password(
                    "admin123"
                ),  # Default password
                must_change_password=True,
            )

            # Convert to dict - use new format (plain email, encrypted other fields)
            user_dict = admin_user.dict()

            # Store email both as searchable and encrypted for compatibility
            original_email = user_dict.get("email")

            # Encrypt PII fields except email (keep email searchable for login)
            encrypted_fields = ["first_name", "last_name", "phone"]
            for field_name in encrypted_fields:
                if field_name in user_dict and user_dict[field_name]:
                    encrypted_field = encryption_service.encrypt_field(
                        user_dict[field_name]
                    )
                    user_dict[f"{field_name}_encrypted"] = encrypted_field.dict()

            # Keep email as plain text for login, but also store encrypted version
            if original_email:
                encrypted_email = encryption_service.encrypt_field(original_email)
                user_dict["email_encrypted"] = encrypted_email.dict()
                # Keep plain email for login compatibility
                user_dict["email"] = original_email

            await db.users.insert_one(user_dict)
            logger.info(f"Created admin user for tenant: {tenant.admin_email}")

        except Exception as e:
            logger.error(f"Failed to create tenant admin: {str(e)}")
            raise

    async def list_tenants(
        self,
        page: int = 1,
        per_page: int = 50,
        status: Optional[str] = None,
        tier: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[Dict[str, Any]], int]:
        """List tenants with pagination and optional filtering"""
        try:
            await self._ensure_connection()
            db = await self._get_db()

            # Build query
            query = {}
            if status:
                query["status"] = status
            if tier:
                query["subscription_tier"] = tier
            if search:
                # Simple text search on company name and admin email
                query["$or"] = [
                    {"company_name": {"$regex": search, "$options": "i"}},
                    {"admin_email": {"$regex": search, "$options": "i"}},
                ]

            # Get total count
            total = await db.tenants.count_documents(query)

            # Get paginated results (exclude MongoDB _id field)
            skip = (page - 1) * per_page
            cursor = (
                db.tenants.find(query).skip(skip).limit(per_page).sort("created_at", -1)
            )
            tenants = await cursor.to_list(length=per_page)

            # Process tenants with proper ObjectId handling and decryption
            decrypted_tenants = []
            for tenant in tenants:
                try:
                    # Clean ObjectId and datetime fields first
                    cleaned_tenant = self._clean_tenant_data(tenant)

                    # Decrypt PII fields with fallback
                    decrypted_tenant = encryption_service.decrypt_pii_fields(
                        cleaned_tenant, self.encrypted_fields
                    )

                    decrypted_tenants.append(decrypted_tenant)

                except Exception as e:
                    logger.warning(
                        f"Failed to process tenant data, using fallback: {str(e)}"
                    )
                    # Create fallback tenant data with safe values
                    fallback_tenant = {
                        "id": tenant.get(
                            "id",
                            str(tenant.get("_id", f"tenant-{len(decrypted_tenants)}")),
                        ),
                        "company_name": "[Processing Error]",
                        "business_type": tenant.get("business_type", "Technology"),
                        "status": tenant.get("status", "active"),
                        "subscription_tier": tenant.get("subscription_tier", "starter"),
                        "admin_email": "[Processing Error]",
                        "admin_first_name": "Unknown",
                        "admin_last_name": "User",
                        "phone": None,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "notes": "Data processing error - manual review needed",
                    }
                    decrypted_tenants.append(fallback_tenant)

            return decrypted_tenants, total

        except Exception as e:
            logger.error(f"Failed to list tenants: {str(e)}")
            raise

    async def get_tenant(self, tenant_id: str) -> Optional[Dict[str, Any]]:
        """Get single tenant by ID"""
        try:
            await self._ensure_connection()
            db = await self._get_db()

            tenant = await db.tenants.find_one({"id": tenant_id})
            if not tenant:
                return None

            try:
                # Clean ObjectId and datetime fields first
                cleaned_tenant = self._clean_tenant_data(tenant)

                # Decrypt PII fields with fallback
                decrypted_tenant = encryption_service.decrypt_pii_fields(
                    cleaned_tenant, self.encrypted_fields
                )

                return decrypted_tenant

            except Exception as e:
                logger.warning(
                    f"Failed to process tenant {tenant_id}, using fallback: {str(e)}"
                )
                # Create fallback tenant data with safe values
                return {
                    "id": tenant.get("id", tenant_id),
                    "company_name": "[Processing Error]",
                    "business_type": tenant.get("business_type", "Technology"),
                    "status": tenant.get("status", "active"),
                    "subscription_tier": tenant.get("subscription_tier", "starter"),
                    "admin_email": "[Processing Error]",
                    "admin_first_name": "Unknown",
                    "admin_last_name": "User",
                    "phone": None,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "notes": "Data processing error - manual review needed",
                }

        except Exception as e:
            logger.error(f"Failed to get tenant {tenant_id}: {str(e)}")
            raise

    async def update_tenant(
        self, tenant_id: str, updates: Dict[str, Any], updated_by: str
    ) -> bool:
        """Update tenant with encrypted PII"""
        try:
            await self._ensure_connection()
            db = await self._get_db()

            # Add metadata
            updates["updated_at"] = datetime.now(timezone.utc)
            updates["updated_by"] = updated_by

            # Encrypt PII fields in updates
            for field_name in self.encrypted_fields:
                if field_name in updates and updates[field_name]:
                    encrypted_field = encryption_service.encrypt_field(
                        updates[field_name]
                    )
                    updates[field_name] = encrypted_field.dict()

            # Update in database
            result = await db.tenants.update_one({"id": tenant_id}, {"$set": updates})

            return result.modified_count > 0

        except Exception as e:
            logger.error(f"Failed to update tenant {tenant_id}: {str(e)}")
            raise

    async def update_tenant_status(
        self, tenant_id: str, status: TenantStatus, updated_by: str
    ) -> bool:
        """Update tenant status"""
        try:
            await self._ensure_connection()
            db = await self._get_db()

            result = await db.tenants.update_one(
                {"id": tenant_id},
                {
                    "$set": {
                        "status": status.value,
                        "updated_at": datetime.now(timezone.utc),
                        "updated_by": updated_by,
                    }
                },
            )

            return result.modified_count > 0

        except Exception as e:
            logger.error(f"Failed to update tenant status {tenant_id}: {str(e)}")
            raise

    async def get_tenant_metrics(self, tenant_id: str) -> Dict[str, Any]:
        """Get tenant usage and health metrics"""
        try:
            await self._ensure_connection()
            db = await self._get_db()

            tenant = await self.get_tenant(tenant_id)
            if not tenant:
                return {}

            # Basic metrics (would be enhanced with real usage data)
            metrics = {
                "tenant_id": tenant_id,
                "status": tenant.get("status", "unknown"),
                "created_at": tenant.get("created_at"),
                "subscription_tier": tenant.get("subscription_tier", "starter"),
                "user_count": await db.users.count_documents({"tenant_id": tenant_id}),
                "last_activity": tenant.get("updated_at", tenant.get("created_at")),
                "health_score": 85,  # Placeholder
            }

            return metrics

        except Exception as e:
            logger.error(f"Failed to get tenant metrics {tenant_id}: {str(e)}")
            raise


# Global tenant service instance
tenant_service = TenantService()
