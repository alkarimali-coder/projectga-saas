#!/usr/bin/env python3
"""
Database Initialization Script
Creates initial admin users and sets up the database
"""
import asyncio
import os
import sys
from datetime import datetime, timezone

# Add the backend directory to the path
sys.path.append(os.path.dirname(__file__))

from database import database
from auth_service import auth_service
from encryption_service import encryption_service
from core_models import User, UserRole, Tenant, TenantTier, TenantStatus


async def create_admin_users():
    """Create initial admin users"""
    print("Creating initial admin users...")

    # First create demo tenant to associate with tech user
    demo_tenant_id = await create_demo_tenant()

    # Super Admin User
    admin_user = User(
        email="admin@coamsaas.com",
        first_name="Super",
        last_name="Admin",
        role=UserRole.SUPER_ADMIN,
        password_hash=auth_service.hash_password("admin123"),
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )

    # Tech User associated with demo tenant
    tech_user = User(
        tenant_id=demo_tenant_id,  # Associate with demo tenant
        email="newtech@coamsaas.com",
        first_name="Tech",
        last_name="User",
        role=UserRole.TECH,  # This will be normalized to TECHNICIAN
        password_hash=auth_service.hash_password("tech123"),
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )

    users_to_create = [admin_user, tech_user]

    for user in users_to_create:
        try:
            # Check if user already exists
            existing = await database.db.users.find_one({"email": user.email})
            if existing:
                print(f"User {user.email} already exists, skipping...")
                continue

            # Convert to dict for encryption
            user_dict = user.dict()

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

            # Insert into database
            result = await database.db.users.insert_one(user_dict)
            print(f"✅ Created user: {user.email} (ID: {result.inserted_id})")

        except Exception as e:
            print(f"❌ Failed to create user {user.email}: {str(e)}")


async def create_demo_tenant():
    """Create a demo tenant for testing"""
    print("Creating demo tenant...")

    demo_tenant = Tenant(
        company_name="Demo Corporation",
        business_type="Technology",
        subscription_tier=TenantTier.ENTERPRISE,
        status=TenantStatus.ACTIVE,
        admin_email="demo@democorp.com",
        admin_first_name="Demo",
        admin_last_name="Admin",
        phone="+1-555-0199",
        website="https://democorp.com",
        address_line1="123 Demo Street",
        city="Demo City",
        state="CA",
        zip_code="90210",
        country="United States",
        notes="Demo tenant for testing purposes",
        created_at=datetime.now(timezone.utc),
    )

    try:
        # Check if demo tenant already exists
        existing = await database.db.tenants.find_one({"id": demo_tenant.id})
        if existing:
            print("Demo tenant already exists, returning existing ID...")
            return demo_tenant.id

        # Convert to dict for encryption
        tenant_dict = demo_tenant.dict()

        # Encrypt PII fields
        encrypted_fields = [
            "admin_email",
            "company_name",
            "phone",
            "address_line1",
            "city",
        ]
        for field_name in encrypted_fields:
            if field_name in tenant_dict and tenant_dict[field_name]:
                encrypted_field = encryption_service.encrypt_field(
                    tenant_dict[field_name]
                )
                tenant_dict[field_name] = encrypted_field.dict()

        # Insert into database
        result = await database.db.tenants.insert_one(tenant_dict)
        print(
            f"✅ Created demo tenant: {demo_tenant.company_name} (ID: {demo_tenant.id})"
        )
        return demo_tenant.id

    except Exception as e:
        print(f"❌ Failed to create demo tenant: {str(e)}")
        return None


async def main():
    """Initialize the database"""
    print("🚀 Initializing COAM SaaS Database...")
    print("=" * 50)

    try:
        # Connect to database
        await database.connect()
        print("✅ Connected to MongoDB")

        # Create admin users (this will create demo tenant first)
        await create_admin_users()

        print("\n✅ Database initialization completed successfully!")
        print("\nDefault Login Credentials:")
        print("  Super Admin: admin@coamsaas.com / admin123")
        print("  Tech User: newtech@coamsaas.com / tech123")

    except Exception as e:
        print(f"❌ Database initialization failed: {str(e)}")
        sys.exit(1)
    finally:
        await database.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
